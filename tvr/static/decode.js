    
    function Tag(acronym, field_length, bit_list) {
      this.acronym = acronym
      this.field_length = field_length
      this.validate = validate_fixed_length
      this.decode = decode_fixed_length
      this.bit_list = bit_list
    }

    function CvmList() {
      this.acronym = 'CVM List'
      this.field_length = 1000
      this.validate = validate_cvm_list
      this.decode = decode_cvm_list
    }

    function CvmResults() {
      this.acronym = 'CVM Results'
      this.field_length = 6
      this.validate = validate_fixed_length
      this.decode = decode_cvm_results
    }

    function validate_fixed_length(value) {
        if (value.length != this.field_length)
            return this.acronym + ' must be exactly ' + this.field_length + ' characters'
        if (!/^[0-9a-fA-F]+$/.test(value))
            return this.acronym + ' must contain only hexadecimal characters. ie 0-9 and A-F.'
        return null
    }

    function decode_fixed_length(value) {
        var output = ""
        var int_value = parseInt(value, 16)
        var len=this.bit_list.length;
        for (var i=0; i<len; i++) {
            var bit_field= this.bit_list[i];
            if ((int_value & bit_field[0]) == bit_field[0]) {
                output += sprintf('<b> %0' + this.field_length + 'X </b> %s<br/>', bit_field[0], bit_field[1])
            }
        }
        return output
    }

    function validate_cvm_list(value) {
        if (value.length < 20)
            return this.acronym + ' must be at least 20 characters'
        if (value.length % 4 != 0)
            return 'The length of ' + this.acronym + ' must be divisible by 4'
        if (!/^[0-9a-fA-F]+$/.test(value))
            return this.acronym + ' must contain only hexadecimal characters. ie 0-9 and A-F.'
        return null
    }

    function decode_cvm_list(value) {
        var x = parseInt(value.substring(0,8), 16)
        var y = parseInt(value.substring(8,16), 16)
        var output = "x = " + x + ", y = " + y
        var len=value.length;
        for (var i=16; i+4<=len; i+=4) {
            var rule = new CVRule(value.substring(i,i+4))
            output += '<br/>' + rule.toString()
        }
        return output
    }
 
    function decode_cvm_results(value) {
        var rule = new CVRule(value.substring(0,4))
        var result = value.substring(4,6)
        return '<b>' + value.substring(0,2) + '</b> ' + rule.cvm_description() 
              + '<br/><b>' + value.substring(2,4) + '</b> ' + rule.condition_code_description() 
              + '<br/><b>' + value.substring(4,6) + '</b> ' +  (result == 1 ? 'Failed' : result == 2 ? 'Sucessful' : 'Unknown')
    }

    function CVRule(hex_string) {
        this.hex_string = hex_string
        var left_byte = parseInt(hex_string.substring(0,2), 16)
        this.fail_if_unsucessful = (left_byte & 0x40) == 0x0
        this.cvm = left_byte & 0x3F
        this.cvm_condition_code = parseInt(hex_string.substring(2,4), 16)
        this.cvm_description = function() {
            var cvm_descriptions = {
                0x00 : 'Fail',
                0x01 : 'Plain PIN by ICC',
                0x02 : 'Encrytped PIN online',
                0x03 : 'Plain PIN by ICC + signature',
                0x04 : 'Encrytped PIN by ICC',
                0x05 : 'Encrytped PIN by ICC + signature',
                0x1E : 'Signature',
                0x1F : 'No CVM required'
            }
            return cvm_descriptions[this.cvm]
        }
        this.condition_code_description = function() {
            var condition_code_descriptions = {
                0x00 : 'Always',
                0x01 : 'If unattended cash',
                0x02 : 'If not (unattended cash, manual cash, purchase + cash)',
                0x03 : 'If terminal supports CVM',
                0x04 : 'If manual cash',
                0x05 : 'If purchase + cash',
                0x06 : 'If transaction in application currency and < X',
                0x07 : 'If transaction in application currency and >= X',
                0x08 : 'If transaction in application currency and < Y',
                0x09 : 'If transaction in application currency and >= Y'
            }
            return condition_code_descriptions[this.cvm_condition_code]
        }
        this.toString = function() {
            return '<b>' + this.hex_string + '</b> '
                + this.cvm_description() 
                + ', ' + this.condition_code_description() 
                + ', ' + (this.fail_if_unsucessful ? 'fail if unsuccesful' : 'apply next')
        }
    }

    var tags = {
        'TVR': new Tag('TVR', 10, [
        [0x8000000000, 'Offline data authentication was not performed'],
        [0x4000000000, 'SDA failed'],
        [0x2000000000, 'ICC data missing'],
        [0x1000000000, 'Card appears on terminal exception file'],
        [0x0800000000, 'DDA failed'],
        [0x0400000000, 'CDA failed'],
        [0x0080000000, 'ICC and terminal have different application versions'],
        [0x0040000000, 'Expired application'],
        [0x0020000000, 'Application not yet effective'],
        [0x0010000000, 'Requested service not allowed for card product'],
        [0x0008000000, 'New card'],
        [0x0000800000, 'Cardholder verification was not successful'],
        [0x0000400000, 'Unrecognised CVM'],
        [0x0000200000, 'PIN try limit exceeded'],
        [0x0000100000, 'PIN entry required and PIN pad not present or not working'],
        [0x0000080000, 'PIN entry required, PIN pad present, but PIN was not entered'],
        [0x0000040000, 'Online PIN entered'],
        [0x0000008000, 'Transaction exceeds floor limit'],
        [0x0000004000, 'Lower consecutive offline limit exceeded'],
        [0x0000002000, 'Upper consecutive offline limit exceeded'],
        [0x0000001000, 'Transaction selected randomly for online processing'],
        [0x0000000800, 'Merchant forced transaction online'],
        [0x0000000080, 'Default TDOL used'],
        [0x0000000040, 'Issuer authentication failed'],
        [0x0000000020, 'Script processing failed before final GENERATE AC'],
        [0x0000000010, 'Script processing failed after final GENERATE AC'],
        ]),
        'TSI': new Tag('TSI', 4, [
        [0x8000, 'Offline data authentication was performed'],
        [0x4000, 'Cardholder verification was performed'],
        [0x2000, 'Card risk management was performed'],
        [0x1000, 'Issuer authentication was performed'],
        [0x0800, 'Terminal risk management was performed'],
        [0x0400, 'Script processing was performed'],
        ]),
        'AIP': new Tag('AIP', 4, [
        [0x4000, 'SDA supported'],
        [0x2000, 'DDA supported'],
        [0x1000, 'Cardholder verification is supported'],
        [0x0800, 'Terminal risk management is to be performed'],
        [0x0400, 'Issuer authentication is supported'],
        [0x0100, 'CDA supported'],
        ]),
        'CVM List': new CvmList(),
        'CVM Results': new CvmResults()
    }
