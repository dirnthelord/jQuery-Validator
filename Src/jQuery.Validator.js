/*
	File: jQuery.Validator.js
	Version: 1.5.8-R1
	Author: Jeff Hansen (Jeffijoe) - Livesys.com
	jQuery: Tested with v1.8.2
	Description: Formless validation of input elements
	Usage: Use .Validate() on a single (or collection of)
	jQuery elements to validate them. Pass an optional object
	for customization. See the GitHub Repo for demos, as well
	as parameter explanation: 
	https://github.com/Livesys/jQuery-Validator
*/
/*
	Recent Changes: @RomeshNiriells
		- Moved all the plugins to this file
		- Now we can validate field if it's marked as data-validate="true"
			previously it didn't work that way. We had to use data-required if we want to validate a field.
*/
(function ($) {
    // Utility function for determining if an input field is truly empty,
    // or if the universe is playing a trick on you.
    jQuery.fn.isEmpty = function () {
        var txt = $.trim(this.val());
        if (txt == this.attr("placeholder") || txt == "") {
            return true;
        }
        return false;
    };

    // The Validate Function
    jQuery.fn.Validate = function (options) {
        // Defaults
        var config = jQuery.extend({
            returnBool: true, // Return bool, or an object with more info?
            useInlineErrors: false, // Display errors in the field?
            required: false, // Are all fields required?
            minLength: 1, // Minimum length in the field?
            maxLength: 0, // Maximum length in the field?
            regex: null, // Do all fields need to pass a regex test?
            selectTextOnFocus: false, // Select all text when focusing a field displaying an error?
            customChecks: [], // Are there any custom checks you'd like to do? (Array of functions)
            noInlineErrors: "", // Any fields who should not display inline errors?
            msg_empty: "This field is required!", // Default global error for empty fields
            msg_lengthreq: "Value must be between $MINLEN$ and $MAXLEN$ characters long.", // Default global error for length requirements
            msg_invalidchars: "The following characters cannot be used: $CHARS$", // Default global error for invalid characters
            msg_regex: "This field did not pass the RegEx test.", // Default global error for regex mismatch
            showSpanError: false
        }, options),

		// All inputs are valid until proven otherwise.
		allValid = true,
		returnObj = {};

        // Initialize returnObj
        returnObj.valid = true;
        returnObj.validInputs = [];
        returnObj.invalidInputs = [];
        returnObj.messages = [];

        // WebKit Bugfix for text selection
        var onMouseUp = function (e) {
            e.preventDefault();
        };


        var insertAfter = function (node, newNode) {
            node.parentNode.insertBefore(newNode, node.nextSibling);
        };

        //creates a span next to the @element with the specified error class
        var insertValidationMessage = function (element) {
            var span = document.createElement('SPAN');
            span.className = config.errorClass;
            insertAfter(element, span);
            return span;
        };

        // Lets loop through all the inputs that shall be validated.
        $(this).each(function () {
            // Function for getting the value to validate upon
            function getVal(elem) {
                if (!elem)
                    elem = $this;
                // The value
                var val;
                if (!data.validateon) {
                    if (elem.is("TEXTAREA"))
                        val = elem.text();
                    else
                        val = elem.val();
                }
                else if (data.validateon == "html")
                    val = elem.html();
                else if (data.validateon == "text")
                    val = elem.text();
                else val = elem.prop(data.validateon);
                return val;
            }

            // Function for setting the value
            function setVal(val, elem) {
                if (!elem)
                    elem = $this;

                if (!data.validateon)
                    elem.val(val);
                else if (data.validateon == "html")
                    elem.html(val);
                else if (data.validateon == "text")
                    elem.text(val);
                else elem.prop(data.validateon, val);
            }

            // Given 2 values, local takes precedence over global, 
            // but only if local is defined.
            function getPropertyValue(global, local) {
                if (local != undefined)
                    return local;
                return global;
            }

            // We're working with THIS input!
            var $this = $(this);
            // Let's get the data of this input.
            var data = $this.data();



            // Should we validate this field?
            if ((config.required) || (data.required) || (data.validate)) {
                // Create an Invalid Input object
                var invalidObject = { messages: [] },

				// Is THIS field invalid?
				thisValid = true,

				// Are we using inline errors?
				inlineErrors = getPropertyValue(config.useInlineErrors, data.use_inline_errors),

                // Are we using a error in a SPAN element
                spanError = getPropertyValue(config.showSpanError, data.use_span_errors),

				// Create onFocus event
				onFocus = function () {
				    // Replace error value with the entered value
				    if (inlineErrors && !$(this).is(config.noInlineErrors)) {
				        // Set value to what it was before
				        if ($(this).data("current_value") == $(this).attr("placeholder"))
				            setVal("", $(this));
				        else
				            setVal($(this).data("current_value"), $(this));

				        // If selectTextOnFocus is true, select the text after removing error text
				        if ((data.selecttextonfocus || config.selectTextOnFocus) && $(this).data("showing_error"))
				            $(this).select();
				        else {
				            // IE7-8 bugfix
				            try {
				                var oSel = document.selection.createRange();
				                oSel.moveStart('character', this.value.length);
				                oSel.moveEnd('character', 0);
				                oSel.select();
				            }
				            catch (error) {
				                // Do nothing
				            }
				        }

				        // Set showing error to false
				        $(this).data("showing_error", false);
				    } else
				        // Remove error class(es) if any
				        $this.removeClass(data.error_class || config.errorClass || "");

				    // Unbind events
				    $this.unbind("focus.Validator mouseup.Validator");
				};

                // -- Validation -- //

                // If we're using Inline Errors, check it.
                if (inlineErrors && data.showing_error) {
                    // Set field value to what it was before, to validate it again
                    setVal(data.current_value);
                    // We're not showing an error anymore
                    data.showing_error = false;

                }

                // Required Test

                // Test if the field is required, and if it is empty.
                var isRequired = getPropertyValue(config.required, data.required);
                if (isRequired && $this.isEmpty()) {
                    // All are not valid anymore.
                    thisValid = false;

                    // Add error message to array
                    invalidObject.messages.push(data.msg_empty || config.msg_empty);
                }

                // Length Check
                var doLengthCheck = false,
				minLength,
				maxLength,
				val = getVal();

                //  Determine what setting we're using - config or data?
                if (data.lengthreq != undefined) {
                    // Get the length requirements
                    data.lengthreq = String(data.lengthreq);
                    doLengthCheck = true;
                    var lengthReqArr = (data.lengthreq.indexOf("-") != -1)
						? data.lengthreq.split("-")
						: (data.lengthreq += "-0").split("-");
                    minLength = lengthReqArr[0];
                    maxLength = lengthReqArr[1];
                } else if (config.minlength != undefined || config.maxlength != undefined) {
                    // Check if the min length req is being satisfied
                    doLengthCheck = true;
                    minLength = config.minLength;
                    maxLength = config.maxLength;
                }

                // Only check length if the field has a value

                if ((data.validate) && (val == undefined || val.length == 0)) {

                    doLengthCheck = false;
                }

                // Do the actual length check, if any.
                if (doLengthCheck && (val.length < minLength || (val.length > maxLength && maxLength != 0))) {
                    var errMsg = (data.msg_lengthreq || config.msg_lengthreq).replace("$MINLEN$", minLength).replace("$MAXLEN$", maxLength);
                    invalidObject.messages.push(errMsg);
                    thisValid = false;
                }

                // Char check
                if (data.invalidchars != undefined || config.invalidChars != undefined) {
                    // What are we testing against?
                    var chars = (data.invalidchars || config.invalidChars);
                    var val = getVal();
                    // Loop, for gods sake, LOOOOOP!
                    for (var i = 0; i < chars.length; i++) {
                        // Get the char we're testing for
                        var thisChar = chars.charAt(i);

                        // Test

                        if (val.indexOf(thisChar) != -1) {
                            // The field contains this char, mark it as invalid
                            thisValid = false;

                            // Push invalid message onto the messages stack
                            invalidObject.messages.push((data.msg_invalidchars || config.msg_invalidchars).replace("$CHARS$", data.invalidchars));

                            // Break the loop
                            break;
                        }
                    }
                }

                // Regex check
                if ( val.length != 0)
                    if (data.regex != undefined || config.regex != undefined) { 
                        // If the value does not match the regex, its a fail.
                        if (!new RegExp(data.regex || config.regex).test(getVal())) {
                            thisValid = false;
                            invalidObject.messages.push(data.msg_regex || config.msg_regex);
                        }
                    }

                // Use the plugins
                if (jQuery.Validator._validatorPlugins.length > 0) {
                    // Loop the list
                    jQuery.each(jQuery.Validator._validatorPlugins, function () {
                        // Short reference
                        var $plugin = this;

                        // Check if the config or data obj contains the key
                        if (data[$plugin.dataProp] != undefined || config[$plugin.configProp] != undefined) {
                            // Get the property & error message values
                            var propValue = data[$plugin.dataProp] != undefined ? data[$plugin.dataProp] : config[$plugin.configProp];
                            var errorMessage = data[$plugin.messageDataProp]
											   || config[$plugin.messageConfigProp]
											   || $plugin.defaultErrorMessage;

                            // Param object
                            var params = {
                                input: $this, // Input being validated
                                propertyValue: propValue, // The value of the property
                                configObject: config, // The config object
                                dataObject: data // The data object of the current input
                            };

                            // Run the method
                            var passed = $plugin.method(params);
                            // Did the method pass?
                            if (!passed) {
                                thisValid = false;

                                // Run message mutator.
                                if ($plugin.messageMutator)
                                    errorMessage = $plugin.messageMutator(params, errorMessage);

                                invalidObject.messages.push(errorMessage);
                            }
                        }
                    });
                }

                // Do the custom checks
                if (config.customChecks.length > 0) {
                    // Loop thru functions and execute them
                    $.each(config.customChecks, function () {
                        var thisCheck = this;
                        var param = { input: $this };
                        if (!thisCheck(param)) {
                            thisValid = false;
                            invalidObject.messages.push(param.message);
                        }
                    });
                }

                // Once all validation is done, push it
                if (!thisValid) {
                    // All is not valid!
                    allValid = false;
                    invalidObject.elem = $this;

                    returnObj.invalidInputs.push(invalidObject);

                    // Aggregate all error messages to a single collection
                    returnObj.messages = returnObj.messages.concat(invalidObject.messages);

                    // Set the text of the field to the error message if we're using inline errors,
                    // and if this field is not excluded from using inline errors
                    if (!data.showing_error && !$this.is("input[type=hidden]")) {
                        if (inlineErrors && !$this.is(config.noInlineErrors)) {
                            // Get the current value of the text, so we can restore it on focus!
                            data.current_value = $this.val();

                            // Let the rest of the code know we're showing an error in this field
                            data.showing_error = true;

                            // Set value
                            setVal(invalidObject.messages[0]);
                        } else if (spanError) {

                            console.log($this.next("span.ve")[0]);
                            // make sure there are no other error spans next to this element
                            if ($this.next("span.ve")[0] == undefined) {
                                var errorSpan = "<span class='ve field-validation-error'>" + invalidObject.messages[0] + "</span>";
                                // Set value 
                                $this.after(errorSpan);
                            }
                        }
                    }
                    // Unbind and Bind the mouseUp event - Webkit Bugfix
                    $this.unbind("mouseup.Validator").bind("mouseup.Validator", onMouseUp);

                    // Unbind, and Bind focus event.
                    $this.unbind("focus.Validator").bind("focus.Validator", onFocus);

                    // If any classes are to be applied, apply them
                    $this.addClass(data.error_class || config.errorClass || "");
                } else {
                    // remove validation error span if exists
                    if ($this.next("span.ve")[0] != undefined) $this.next("span.ve")[0].remove();

                    // This field passed validation! Remove the error class 
                    // if any, as well as the saved text, onFocus event, and onMouseUp event.
                    $this.removeClass(data.error_class || config.errorClass || "");
                    $this.data({ current_value: undefined, showing_error: false });

                    // Add this field to the validInputs collection
                    returnObj.validInputs.push($this);
                }
                // Call the onFieldValidated callback
                if (config.onFieldValidated != undefined)
                    config.onFieldValidated($this, thisValid, invalidObject);
            }
        });
        // Set the valid result on the returnObject
        returnObj.valid = allValid;

        // In the end, we return the bit, or the object.
        if (config == undefined || config.returnBool)
            return allValid;

        // Not returning a bit? Ok! Return object
        return returnObj;

    };

    // Clear Validation data
    jQuery.fn.Validate_Clear = function (clearFields) {
        // Get this.
        return $(this).each(function () {
            // Unbind events
            var $this = $(this);
            $this.unbind("mouseup.Validator focus.Validator");

            // Clear data
            $this.data({
                showing_error: false,
                current_value: ""
            });

            // Remove error class
            $this.removeClass("error");

            // Check if we should clear fields
            if (clearFields) {
                $this.val("");
            }
        });


    };

    // The Validator Object, for extending the validator
    // with custom checks (plugin-style)
    jQuery.Validator = {
        // Internal list of validator plugins
        _validatorPlugins: [],

        // The Extend method - adds the plugin to the list.
        // Takes a ValidatorPlugin Object as input
        Extend: function (validatorPlugin) {
            // Push the plugin to the list
            this._validatorPlugins.push(validatorPlugin);
        }
    };
})(jQuery);


/*
 * jQuery-Validator Knockout bindings.
 * Version: 0.4 
 * Author: Jeff Hansen <jeffijoe.com>

 * (Could definitely use more features, 
    but for what I need it for at the moment, 
    this is good enough.)

 * Dependencies: 
    - jQuery 
    - jQuery.IsEmpty + jQuery-Validator 
        (both found at https://github.com/jeffijoe/jQuery-Validator)
    - KnockoutJS, obviously.

 * Usage: See demos.
 */

(function ($, ko) {
    // Make sure JQV is loaded.
    if (!$.fn.Validate) throw new Error("I can't seem to locate jQuery-Validator. Has it been loaded?");

    var _selector = "*[data-required],*[data-validate]";

    /*
     * Constructor 
     */
    ko.jqValidation = function (config) {
        return new function () {
            var self = this;
            $.extend(self, config);

            self.containerElement = null;
            self.Validate = function () {
                if (!self.containerElement)
                    throw new Error("Validate called, but container element has not been set yet.");
                var elements = self.containerElement.find(_selector);
                return elements.Validate(self);
            };
        };
    };

    /*
     * Binding handler
     */
    ko.bindingHandlers.jqValidation = {
        init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
            var $elem = $(element),
                validationCtx = valueAccessor();
            validationCtx.containerElement = $elem;
            ko.utils.domNodeDisposal.addDisposeCallback(element, function () {
                validationCtx.containerElement = null;
            });
        }
    };
})(jQuery, ko);


/*
	File: jQuery.Validator.Checkbox.js
	Version: 0.1 (jQuery.Validator 1.4.6)
	Author: Jeff Hansen (Jeffijoe) - Livesys.com
	jQuery: Tested with v1.8.2
	Description: Adds support for checkboxes with data-required.
*/
jQuery(function () {
    // Extend the validator object.
    $.Validator.Extend({
        dataProp: "required", // The property on the element - eg. <input type="text" data-email="true" />
        configProp: "required", // The property on the config.
        messageDataProp: "msg_empty", // The error message property on the element
        messageConfigProp: "msg_empty", // The error message property on the config
        method: function (paramObj) {
            // The property value indicates if this is a required field or not.
            // Also make sure its a checkbox.
            if (paramObj.input.is("[type=checkbox]") && paramObj.propertyValue)
                // If the field is not checked, return false.
                if (!paramObj.input.prop("checked"))
                    return false;
            // Success, return true!
            return true;
        }
    });
});



/*
	File: jQuery.Validator.CheckboxGroup.js
	Version: 0.1 (jQuery.Validator 1.5.8)
	Author: Jeff Hansen (Jeffijoe) - Jeffijoe.com
	jQuery: Tested with v2
	Description: Adds support for checkbox groups. See example in Demos folder.
    This was requested on my blog: http://jeffijoe.com/2013/06/validation-in-knockout-js/#comment-1199334982
*/
jQuery(function () {
    // Extend the validator object.
    $.Validator.Extend({
        dataProp: "checkboxgroup", // The property on the element - eg. <div data-checkboxgroup="1" /> for alteast 1 checkbox to have been checked.
        configProp: "checkboxgroup", // The property on the config. You wouldn't use this in this case though.
        messageDataProp: "msg_checkboxgroup", // The error message property on the element
        messageConfigProp: "msg_checkboxgroup", // The error message property on the config
        defaultErrorMessage: "You need to check atleast $VALUE$ values.",
        // (New in Validator 1.5.8) allows you to modify the error message.
        messageMutator: function (paramObj, errorMessage) {
            return errorMessage.replace("$VALUE$", paramObj.propertyValue);
        },
        method: function (paramObj) {
            // The property value tells us the required amount of checkboxes 
            // that must be checked.
            console.log("param:", paramObj);
            if (paramObj.propertyValue) {
                var requiredCount = paramObj.propertyValue;
                // Get checkboxes in this container
                var checked = paramObj.input.find("INPUT:checkbox:checked").length;
                console.log("Checked: ", checked);
                if (checked < requiredCount) {
                    console.log("False");
                    return false;
                }
            }
            console.log("True");
            // Success, return true!
            return true;
        }
    });
});

/*
	File: jQuery.Validator.CultureCode.js
	Version: 0.8 (jQuery.Validator 1.4.7)
	Author: Jeff Hansen (Jeffijoe) - Livesys.com
	jQuery: Tested with v2.0
	Description: E-Mail validation plugin for jQuery.Validator.js
*/
jQuery(function () {
    // Default error message.
    var _defaultErrorMessage = "Not a valid E-mail address.";

    // Extend the validator object.
    $.Validator.Extend({
        dataProp: "culturecode", // The property on the element - eg. <input type="text" data-email="true" />
        configProp: "isCultureCode", // The property on the config.
        messageDataProp: "msg_invalidculturecode", // The error message property on the element
        messageConfigProp: "msg_invalidculturecode", // The error message property on the config
        defaultErrorMessage: _defaultErrorMessage, // Default error message when validation fails and no message has been explicitly set.
        method: function (paramObj) {
            // The property value indicates if this is an email field or not.
            // Obviously, if it wasnt, the property wouldnt be there, but oh well. :P
            if (paramObj.propertyValue)
                // E-Mail regex check
                if (!new RegExp(/^[a-z]{2,3}(?:-[A-Z]{2,3}(?:-[a-zA-Z]{4})?)?$/).test(paramObj.input.val())) {
                    return false;
                }
            // Success, return true!
            return true;
        }
    });
});

/*
	File: jQuery.Validator.EmailPlugin.js
	Version: 0.8 (jQuery.Validator 1.4.7)
	Author: Jeff Hansen (Jeffijoe) - Livesys.com
	jQuery: Tested with v1.8.2
	Description: E-Mail validation plugin for jQuery.Validator.js
*/
jQuery(function () {
    // Default error message.
    var _defaultErrorMessage = "Not a valid E-mail address.";

    // Extend the validator object.
    $.Validator.Extend({
        dataProp: "email", // The property on the element - eg. <input type="text" data-email="true" />
        configProp: "isEmail", // The property on the config.
        messageDataProp: "msg_invalidemail", // The error message property on the element
        messageConfigProp: "msg_invalidemail", // The error message property on the config
        defaultErrorMessage: _defaultErrorMessage, // Default error message when validation fails and no message has been explicitly set.
        method: function (paramObj) {
            // The property value indicates if this is an email field or not.
            // Obviously, if it wasnt, the property wouldnt be there, but oh well. :P
            if (paramObj.propertyValue) {
                var val = paramObj.input.val();
                var required = (paramObj.configObject.required) || (paramObj.dataObject.required);
                if ((paramObj.dataObject.validate) && (val.length == 0) && !required)
                    return true;
                else {
                    // E-Mail regex check
                    if (!new RegExp(/^[_a-z0-9-]+(\.[_a-z0-9-]+)*@[a-z0-9-]+(\.[a-z0-9-]+)*(\.[a-z]{2,4})$/i).test(val)) {
                        return false;
                    }
                }
            }
            // Success, return true!
            return true;
        }
    });
});

/*
	File: jQuery.Validator.FieldMatch.js
	Version: 0.8 (jQuery.Validator 1.4.7)
	Author: Jeff Hansen (Jeffijoe) - Livesys.com
	jQuery: Tested with v1.8.2
	Description: Field-match plugin for jQuery.Validator.js to ensure 2 fields are equal.
*/
jQuery(function () {
    // Default error message.
    var _defaultErrorMessage = "Fields did not match.";

    // Extend the validator object.
    $.Validator.Extend({
        dataProp: "mustmatch", // The property on the element - eg. <input type="text" data-mustmatch="#passwordAgain" />
        configProp: "mustMatch", // The property on the config. This case, a jQuery selector for the field to match values against.
        messageDataProp: "msg_invalidmatch", // The error message property on the element
        messageConfigProp: "msg_invalidmatch", // The error message property on the config
        defaultErrorMessage: _defaultErrorMessage, // Default error message when validation fails and no message has been explicitly set.
        method: function (paramObj) {
            // The property value indicates if this is an email field or not.
            // Obviously, if it wasnt, the property wouldnt be there, but oh well. :P
            if (paramObj.propertyValue)
                return $(paramObj.propertyValue).val() == paramObj.input.val();
            // Success, return true!
            return true;
        }
    });
});

/*
	File: jQuery.Validator.KendoMultiselect.js
	Version: 0.1 (jQuery.Validator 1.4.6)
	Author: Jeff Hansen (Jeffijoe) - Livesys.com
	jQuery: Tested with v1.9.1
	Description: KendoUI Web Multiselect Validation for jQuery.Validator.js
    
    IMPORTANT: Currently only works when the multiselect instance
    is stored in the kendoMultiSelect data property.

    In order for it to function properly at this point,
    you need to add data-required="false" to the select tag.
*/
jQuery(function () {
    // Apply Error Class
    // This applies the error class to the correct
    // element, if specified.
    // TODO: Currently no support for inline errors..
    var applyErrorClass = function (obj, shouldAdd) {
        if (obj.configObject.errorClass && shouldAdd) {
            obj.input.parent().addClass(obj.configObject.errorClass);
        } else
            obj.input.parent().removeClass(obj.configObject.errorClass);
    };

    // Extend the validator object.
    $.Validator.Extend({
        dataProp: "k_multiselect", // The property on the element
        configProp: "isKendoMultiselect", // The property on the config.
        messageDataProp: "msg_invalid_selection", // The error message property on the element
        messageConfigProp: "msg_invalidSelection", // The error message property on the config
        method: function (paramObj) {
            // The property is a bool, indicating if this is a kendo multiselect
            if (paramObj.propertyValue) {
                // Get the value of the multiselect
                var value = paramObj.dataObject["kendoMultiSelect"].value();

                // If there is a minimum value defined, validate it
                var minValue = paramObj.dataObject["min_selection"] || paramObj.configObject["minSelection"] || 0;
                if (minValue != 0 && value.length < minValue) {
                    applyErrorClass(paramObj, true);
                    return false;
                }

                // If there is a maximum value defined, validate it
                var maxValue = paramObj.dataObject["max_selection"] || paramObj.configObject["maxSelection"] || 0;
                if (maxValue != 0 && value.length > maxValue) {
                    applyErrorClass(paramObj, true);
                    return false;
                }
            }

            // Success, return true!
            applyErrorClass(paramObj, false);
            return true;
        }
    });
});

/*
	File: jQuery.Validator.Phonenumber.js
	Version: 0.5 (jQuery.Validator 1.4.6)
	Author: Jeff Hansen (Jeffijoe) - Livesys.com
	jQuery: Tested with v1.8.2
	Description: Phone number validation plugin for jQuery.Validator.js
*/
jQuery(function () {
    // Extend the validator object.
    $.Validator.Extend({
        dataProp: "phone", // The property on the element - eg. <input type="text" data-email="true" />
        configProp: "isPhone", // The property on the config.
        messageDataProp: "msg_invalidphonenumber", // The error message property on the element
        messageConfigProp: "msg_invalidphonenumber", // The error message property on the config
        method: function (paramObj) {
            // The property value indicates if this is a phonenumber field or not.
            if (paramObj.propertyValue)
                // Phone number regex check
                // Requires atleast 7 numbers. Can use +, -, etc (all valid phone number chars)
                if (!(/^\d{7,}$/).test(paramObj.input.val().replace(/[\s()+\-\.]|ext/gi, ''))) {
                    // Failed, return false
                    return false;
                }
            // Success, return true!
            return true;
        }
    });
});


/*
	File: jQuery.Validator.Url.js
	Version: 0.2 (jQuery.Validator 1.4.6)
	Author: Jeff Hansen (Jeffijoe) - Livesys.com
	jQuery: Tested with v1.9.1
	Description: URL Validation.

    Regex author: Diego Perini
*/
jQuery(function () {
    // Extend the validator object.
    $.Validator.Extend({
        dataProp: "url", // The property on the element
        configProp: "isUrl", // The property on the config.
        messageDataProp: "msg_invalid_url", // The error message property on the element
        messageConfigProp: "msg_invalidUrl", // The error message property on the config
        method: function (paramObj) {
            // The property is a bool, indicating if this is an URL field.
            if (paramObj.propertyValue) {
                // Check if this is a valid URL
                var pattern = new RegExp(
                                                "^" +
                                                // protocol identifier
                                                "(?:(?:https?|ftp)://)" +
                                                // user:pass authentication
                                                "(?:\\S+(?::\\S*)?@)?" +
                                                "(?:" +
                                                // IP address exclusion
                                                // private & local networks
                                                "(?!10(?:\\.\\d{1,3}){3})" +
                                                "(?!127(?:\\.\\d{1,3}){3})" +
                                                "(?!169\\.254(?:\\.\\d{1,3}){2})" +
                                                "(?!192\\.168(?:\\.\\d{1,3}){2})" +
                                                "(?!172\\.(?:1[6-9]|2\\d|3[0-1])(?:\\.\\d{1,3}){2})" +
                                                // IP address dotted notation octets
                                                // excludes loopback network 0.0.0.0
                                                // excludes reserved space >= 224.0.0.0
                                                // excludes network & broacast addresses
                                                // (first & last IP address of each class)
                                                "(?:[1-9]\\d?|1\\d\\d|2[01]\\d|22[0-3])" +
                                                "(?:\\.(?:1?\\d{1,2}|2[0-4]\\d|25[0-5])){2}" +
                                                "(?:\\.(?:[1-9]\\d?|1\\d\\d|2[0-4]\\d|25[0-4]))" +
                                                "|" +
                                                // host name
                                                "(?:(?:[a-z\\u00a1-\\uffff0-9]+-?)*[a-z\\u00a1-\\uffff0-9]+)" +
                                                // domain name
                                                "(?:\\.(?:[a-z\\u00a1-\\uffff0-9]+-?)*[a-z\\u00a1-\\uffff0-9]+)*" +
                                                // TLD identifier
                                                "(?:\\.(?:[a-z\\u00a1-\\uffff]{2,}))" +
                                                ")" +
                                                // port number
                                                "(?::\\d{2,5})?" +
                                                // resource path
                                                "(?:/[^\\s]*)?" +
                                                "$", "i"
                                            );

                // Do the test
                return (pattern.test(paramObj.input.val()));
            }

            // Success, return true!
            return true;
        }
    });
});



/*
	File: jQuery.Validator.NumbersOnly.js
	Version: 0.5 (jQuery.Validator 1.4.6)
	Author: Romesh Niriella (@RomeshNiriella)
	jQuery: Tested with v1.8.2
	Description:  Validates a number (decimals included)
*/
jQuery(function () {
    // Extend the validator object.
    $.Validator.Extend({
        dataProp: "number", // The property on the element - eg. <input type="text" data-number="true" />
        configProp: "isNumber", // The property on the config.
        messageDataProp: "msg_invalidnumber", // The error message property on the element
        messageConfigProp: "msg_invalidnumber", // The error message property on the config
        method: function (paramObj) {
            // The property value indicates if this is a number field or not.
            if (paramObj.propertyValue)
                // Nnumber regex check
                // decimals/digits
                if (!(/^\d+(\.\d+)?$/).test(paramObj.input.val().replace(/[\s()+\-\.]|ext/gi, ''))) {
                    // Failed, return false
                    return false;
                }
            // Success, return true!
            return true;
        }
    });
});

  
