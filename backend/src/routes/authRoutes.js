const express = require("express");
const ctrl = require("../controllers/authController");
const authenticate = require("../middlewares/auth");
const validate = require("../middlewares/validate");
const v = require("../middlewares/validators");

const router = express.Router();

// Públicas
router.post("/register", v.registerRules, validate, ctrl.register);
router.post("/login", v.loginRules, validate, ctrl.login);
router.post("/logout", ctrl.logout);
router.post("/forgot-password", v.forgotRules, validate, ctrl.forgotPassword);
router.post("/reset-password", v.resetRules, validate, ctrl.resetPassword);

// Protegidas
router.get("/profile", authenticate, ctrl.profile);
router.put("/profile", authenticate, v.updateNameRules, validate, ctrl.updateProfile);
router.put("/change-password", authenticate, v.changePasswordRules, validate, ctrl.changePassword);

module.exports = router;
