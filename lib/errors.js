/*
UnexpectedToken(token, position, src)
Expected(token, position, src)
ArgumentExpected(position, src)
VariableNotFound(variableName)
*/

var UnexpectedToken = module.exports.UnexpectedToken = function UnexpectedToken(token, position, src) {
    this.name = "UnexpectedToken";
    this.message = 'Unexpected Token "'+token+'" at position '+position;
}
UnexpectedToken.prototype = Error.prototype;

var Expected = module.exports.Expected = function Expected(token, position, src) {
    this.name = "Expected";
    this.message = 'Expected "'+token+'" but found "'+src.substr(position-1, position)+'" instead at position '+position;
}
Expected.prototype = Error.prototype;

var ArgumentExpected = module.exports.ArgumentExpected = function ArgumentExpected(position, src) {
    this.name = "ArgumentExpected";
    this.message = 'Argument expected at position '+position;
}
ArgumentExpected.prototype = Error.prototype;

var VariableNotFound = module.exports.VariableNotFound = function VariableNotFound(variableName) {
    this.name = "VariableNotFound";
    this.message = 'Requested variable could not be found: '+variableName;
}
VariableNotFound.prototype = Error.prototype;
