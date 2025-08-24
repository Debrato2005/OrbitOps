const express = require("express");
const router = express.Router();
const authService = require("../services/authService");
const { authenticateToken } = require("../middleware/auth");

router.post("/logout", async (req, res) => {
  try {
    const token = req.cookies.orbitops_session;

    let logoutResult = true;
    if (token) {
      logoutResult = await authService.logout(token);
    }

    res.clearCookie("orbitops_session", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
    });

    res.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    res.clearCookie("orbitops_session", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
    });

    res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Server error during logout",
      },
    });
  }
});

router.get("/validate", authenticateToken, async (req, res) => {
  try {
    res.json({
      success: true,
      valid: true,
      user: {
        companyId: req.user.companyId,
        email: req.user.email,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Server error during validation",
      },
    });
  }
});

router.post("/refresh", async (req, res) => {
  try {
    const currentToken = req.cookies.orbitops_session;

    if (!currentToken) {
      return res.status(401).json({
        success: false,
        error: {
          code: "NO_TOKEN",
          message: "No token provided for refresh",
        },
      });
    }

    const newToken = await authService.refreshToken(currentToken);

    if (!newToken) {
      return res.status(401).json({
        success: false,
        error: {
          code: "TOKEN_EXPIRED",
          message: "Token is invalid or expired",
        },
      });
    }

    res.cookie("orbitops_session", newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      message: "Token refreshed successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Server error during token refresh",
      },
    });
  }
});

module.exports = router;
