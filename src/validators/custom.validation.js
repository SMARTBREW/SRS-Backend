const objectId = (value, helpers) => {
    if (!value.match(/^[0-9a-fA-F]{24}$/)) {
      return helpers.message('"{{#label}}" must be a valid mongo id');
    }
    return value;
  };
  
  const password = (value, helpers) => {
    if (value.length < 8) {
      return helpers.message('password must be at least 8 characters');
    }
    if (!value.match(/\d/) || !value.match(/[a-zA-Z]/)) {
      return helpers.message('password must contain at least 1 letter and 1 number');
    }
    return value;
  };
  
  const mobile = (value, helpers) => {
  if (value.length !== 10) {
    return helpers.message('mobile must be of 10 characters');
  }
  if (!value.match(/^[6-9]\d{9}$/)) {
    return helpers.message('mobile must be a valid 10-digit number starting with 6-9');
  }
  return value;
};
  
  module.exports = {
    objectId,
    password,
    mobile,
  };