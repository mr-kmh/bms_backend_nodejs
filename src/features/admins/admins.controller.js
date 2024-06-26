import httpStatus from "http-status-codes";
import { matchedData, validationResult } from "express-validator";
import adminService from "./admins.service.js";
import {
  ACCESS_DENIED_ERR,
  ADMIN_NOT_FOUND_ERR,
  ALREADY_ACTIVATED_ERR,
  DEPOSIT_ERR,
  INSUFFICIENT_AMOUNT_ERR,
  RECEIVER_NOT_FOUND_ERR,
  SAME_USER_ERR,
  SENDER_NOT_FOUND_ERR,
  USER_ALREADY_CREATED,
  USER_NOT_FOUND_ERR,
  WITHDRAW_ERR,
} from "../../errors/errors.js";
import { generateToken } from "./admins.handler.js";

const findAllAdmin = async (req, res) => {
  let admins = await adminService.findAll();
  return res.status(httpStatus.OK).json({ data: admins });
};

const findAdminByCode = async (req, res) => {
  const { data } = matchedData(req);
  const admin = await adminService.findByAdminCode(data.adminCode);
  if (admin.error) {
    switch (admin.error) {
      case ADMIN_NOT_FOUND_ERR:
        return res.status(httpStatus.BAD_REQUEST).json({
          message: `Not found admin with admin code: ${data.adminCode}`,
        });
    }
  }
  return res.status(httpStatus.OK).json({ data: admin.data });
};

const createAdmin = async (req, res) => {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    return res.status(httpStatus.BAD_REQUEST).json({ message: result.array() });
  }
  const data = matchedData(req);
  const admin = await adminService.create(data);
  if (admin.error) return res.status(httpStatus.INTERNAL_SERVER_ERROR).end();
  return res.status(201).json({ data: admin.data });
};

const deactivateAdmin = async (req, res) => {
  const { data } = matchedData(req);
  let admin = await adminService.findByAdminCode(data.adminCode);

  if (admin.error) {
    switch (admin.error) {
      case ADMIN_NOT_FOUND_ERR:
        return res.status(httpStatus.BAD_REQUEST).json({
          message: `Not found admin with admin code: ${data.adminCode}`,
        });
    }
  }
  if (admin.data.isDeactivated) {
    return res.status(httpStatus.BAD_REQUEST).json({
      message: "Admin is already deactivated",
    });
  }
  admin = await adminService.deactivate(data.adminCode);
  if (admin.error) {
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).end();
  }
  return res.status(httpStatus.OK).json({ data: admin.data });
};

const activateAdmin = async (req, res) => {
  const { data } = matchedData(req);
  const admin = await adminService.activate(data.adminCode);
  if (admin.error) {
    switch (admin.error) {
      case ADMIN_NOT_FOUND_ERR:
        return res.status(httpStatus.BAD_REQUEST).json({
          message: `Not found admin with admin code: ${data.adminCode}`,
        });
      case ALREADY_ACTIVATED_ERR:
        return res.status(httpStatus.BAD_REQUEST).json({
          message: "Admin is already activated",
        });
    }
  }
  return res.status(httpStatus.OK).json({ data: admin.data });
};

const adminActions = async (req, res) => {
  const result = validationResult(req);
  if (result.isEmpty()) {
    const { process } = matchedData(req);
    switch (process) {
      case "deactivate":
        return await deactivateAdmin(req, res);
      case "activate":
        return await activateAdmin(req, res);
      case "search":
        return await findAdminByCode(req, res);
      default:
        return res
          .status(httpStatus.BAD_REQUEST)
          .json({ message: "Invalid process name" });
    }
  }
  return res.status(httpStatus.BAD_REQUEST).json({ message: result.array() });
};

const transfer = async (req, res) => {
  const { data } = matchedData(req);
  const adminCode = req.adminCode;

  const transaction = await adminService.transfer({
    senderUsername: data.sender,
    receiverUsername: data.receiver,
    transferAmount: data.transferAmount,
    note: data.note,
    adminCode,
  });

  if (transaction.error) {
    switch (transaction.error) {
      case SAME_USER_ERR:
        return res.status(httpStatus.BAD_REQUEST).json({
          message: "Sender and receiver must not be the same user",
        });
      case SENDER_NOT_FOUND_ERR:
        return res
          .status(httpStatus.BAD_REQUEST)
          .json({ message: "Sender not found" });
      case RECEIVER_NOT_FOUND_ERR:
        return res
          .status(httpStatus.BAD_REQUEST)
          .json({ message: "Receiver not found" });
      case INSUFFICIENT_AMOUNT_ERR:
        return res
          .status(httpStatus.BAD_REQUEST)
          .json({ message: "Insufficient amount" });
      case ACCESS_DENIED_ERR:
        return res
          .status(httpStatus.FORBIDDEN)
          .json({ message: "User is not authorized to perform this action." });
    }
  }

  return res.status(httpStatus.OK).json({ data: transaction.data });
};

const listTransactionsByUserEmail = async (req, res) => {
  const { data } = matchedData(req);
  const transactions = await adminService.getTransactions(data.username);

  if (transactions.error) {
    switch (transactions.error) {
      case ADMIN_NOT_FOUND_ERR:
        return res
          .status(httpStatus.BAD_REQUEST)
          .json({ message: "Admin not found." });
    }
  }

  return res.status(httpStatus.OK).json({ data: transactions.data });
};

const withdrawOrDeposit = async (req, res) => {
  let user;
  const { process, data } = matchedData(req);
  const adminCode = req.adminCode;

  switch (process) {
    case "withdraw":
      user = await adminService.withdraw(data.username, data.amount, adminCode);
      break;
    case "deposit":
      user = await adminService.deposit(data.username, data.amount, adminCode);
      break;
  }

  if (user.error) {
    switch (user.error) {
      case ADMIN_NOT_FOUND_ERR:
        return res
          .status(httpStatus.BAD_REQUEST)
          .json({ message: "Admin not found" });
      case USER_NOT_FOUND_ERR:
        return res
          .status(httpStatus.BAD_REQUEST)
          .json({ message: "User not found" });
      case INSUFFICIENT_AMOUNT_ERR:
        return res
          .status(httpStatus.BAD_REQUEST)
          .json({ message: "Insufficient amount" });
      case WITHDRAW_ERR:
      case DEPOSIT_ERR:
        return res
          .status(httpStatus.BAD_REQUEST)
          .json({ message: "Something go wrong!" });
      case ACCESS_DENIED_ERR:
        return res
          .status(httpStatus.FORBIDDEN)
          .json({ message: "User is not authorized to perform this action." });
    }
  }

  return res.status(httpStatus.OK).json({ data: user.data });
};

const transactions = async (req, res) => {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    return res.status(httpStatus.BAD_REQUEST).json({ message: result.array() });
  }
  const { process } = matchedData(req);
  switch (process) {
    case "transfer":
      return transfer(req, res);
    case "withdraw":
    case "deposit":
      return withdrawOrDeposit(req, res);
    case "list":
      return listTransactionsByUserEmail(req, res);
    default:
      return res
        .status(httpStatus.BAD_REQUEST)
        .json({ message: "Invalid transfer type name" });
  }
};

const userRegistration = async (req, res) => {
  const result = validationResult(req);

  if (!result.isEmpty())
    return res.status(httpStatus.BAD_REQUEST).json({ message: result.array() });

  const data = matchedData(req);

  data.adminCode = req.adminCode;

  const user = await adminService.userRegistration(data);
  if (user.error)
    switch (user.error) {
      case USER_ALREADY_CREATED:
        return res
          .status(httpStatus.BAD_REQUEST)
          .json({ message: "User is already created." });
      case ADMIN_NOT_FOUND_ERR:
        return res
          .status(httpStatus.BAD_REQUEST)
          .json({ message: `Admin not found with code ${data.adminCode}.` });
      default:
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).end();
    }

  return res.status(httpStatus.CREATED).json({ data: user.data });
};

const login = async (req, res) => {
  const result = validationResult(req);
  if (!result.isEmpty())
    return res.status(httpStatus.BAD_REQUEST).json({ message: result.array() });

  const { adminCode, password } = matchedData(req);
  const { data, error } = await adminService.login(adminCode, password);
  if (error)
    switch (error) {
      default:
        return res
          .status(httpStatus.FORBIDDEN)
          .json({ message: "Accessed denied." });
    }

  const token = generateToken({ adminCode, role: data.role });
  return res
    .status(httpStatus.OK)
    .cookie("token", token, { httpOnly: true, secure: true })
    .json({ data });
};

const transactionsForAdmin = async (req, res) => {
  const result = validationResult(req);
  if (!result.isEmpty())
    return res.status(httpStatus.BAD_REQUEST).json({ message: result.array() });

  const { adminCode } = matchedData(req);
  const transactions = await adminService.getTransactionsForAdmin(adminCode);
  return res.status(httpStatus.OK).json({ data: transactions.data });
};

const getUserByAdminCode = async (req, res) => {
  const result = validationResult(req);
  if (!result.isEmpty())
    return res.status(httpStatus.BAD_REQUEST).json({ message: result.array() });

  const { adminCode } = matchedData(req);

  const { data, error } = await adminService.getUserByAdminCode(adminCode);
  if (error) {
    switch (error) {
      case ADMIN_NOT_FOUND_ERR:
        return res
          .status(httpStatus.BAD_REQUEST)
          .json({ message: `Admin not found with code ${adminCode}` });

      default:
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).end();
    }
  }
  return res.status(httpStatus.OK).json({ data });
};

export default {
  findAllAdmin,
  createAdmin,
  adminActions,
  transactions,
  userRegistration,
  login,
  transactionsForAdmin,
  getUserByAdminCode,
};
