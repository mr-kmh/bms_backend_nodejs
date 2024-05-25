import { checkSchema, matchedData } from "express-validator";

const validationForDeactivate = () => {
  return checkSchema({
    managerId: {
      notEmpty: true,
      errorMessage: "Manager ID is required.",
    },
    data: {
      notEmpty: true,
      errorMessage: "Data field is required.",
    },
    "data.adminCode": {
      notEmpty: true,
      errorMessage: "Admin's personal code is required to deactivate.",
    },
  });
};

const adminActionValidation = async (req, res, next) => {
  const { process } = matchedData(req);
  switch (process) {
    case "deactivate":
      await validationForDeactivate().run(req);
      break;
    case "search":
      await validationForDeactivate().run(req);
      break;
  }
  next();
};

const validationForTransfer = () => {
  return checkSchema({
    adminId: {
      notEmpty: true,
      errorMessage: "Admin id is required.",
    },
    process: {
      notEmpty: true,
      errorMessage: "Transfer type if required.",
    },
    data: {
      notEmpty: true,
      errorMessage: "Data is required.",
    },
    "data.senderEmail": {
      notEmpty: {
        errorMessage: "Sender email must not be empty.",
      },
      isEmail: {
        errorMessage: "Invalid email.",
      },
    },
    "data.receiverEmail": {
      notEmpty: {
        errorMessage: "Receiver email must not be empty.",
      },
      isEmail: {
        errorMessage: "Invalid email",
      },
    },
    "data.transferAmount": {
      isDecimal: {
        errorMessage: "Invalid transfer amount. It must be decimal.",
      },
      custom: {
        options: (value) => {
          return value > 0;
        },
        errorMessage: "Amount must be greater than 0.",
      },
    },
    "data.note": {
      optional: true,
      default: "",
    },
  });
};

const validationForListOfTransaction = () => {
  return checkSchema({
    adminId: {
      notEmpty: true,
      errorMessage: "Admin id is required.",
    },
    process: {
      notEmpty: true,
      errorMessage: "Transfer type if required.",
    },
    data: {
      notEmpty: true,
      errorMessage: "Data is required.",
    },
    "data.userEmail": {
      notEmpty: true,
      isEmail: {
        errorMessage: "Invalid email",
      },
    },
  });
};

const validationForWithdrawOrDeposit = () => {
  return checkSchema({
    adminId: {
      notEmpty: true,
      errorMessage: "Admin id is required.",
    },
    process: {
      notEmpty: true,
      errorMessage: "Transfer type if required.",
    },
    data: {
      notEmpty: true,
      errorMessage: "Data is required.",
    },
    "data.userEmail": {
      notEmpty: true,
      isEmail: {
        errorMessage: "Invalid email",
      },
    },
    "data.amount": {
      notEmpty: true,
      isDecimal: true,
      custom: {
        options: (value) => {
          return value > 0;
        },
        errorMessage: "Invalid amount",
      },
      errorMessage: "Invalid amount",
    },
  });
};

const transactionValidation = async (req, res, next) => {
  const { process } = matchedData(req);
  switch (process) {
    case "transfer":
      await validationForTransfer().run(req);
      break;
    case "withdraw":
    case "deposit":
      await validationForWithdrawOrDeposit().run(req);
      break;
    case "list":
      await validationForListOfTransaction().run(req);
      break;
  }
  next();
};

const validationForUserRegistration = () => {
  return checkSchema({
    name: {
      notEmpty: true,
      errorMessage: "User name is required.",
    },
    email: {
      notEmpty: {
        errorMessage: "User email is required.",
      },
      isEmail: {
        errorMessage: "Invalid email",
      },
    },
    stateCode: {
      notEmpty: true,
      errorMessage: "StateCode must not empty.",
    },
    townshipCode: {
      notEmpty: true,
      errorMessage: "TownshipCode must not empty.",
    },
    adminId: {
      notEmpty: true,
      errorMessage: "Admin id is required.",
    },
  });
};

export {
  adminActionValidation,
  transactionValidation,
  validationForUserRegistration,
};
