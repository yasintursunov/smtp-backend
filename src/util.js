const { customAlphabet } = require('nanoid'); 
const nano = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 48); 
function getUniqIdValue(){return nano();} module.exports={getUniqIdValue};
