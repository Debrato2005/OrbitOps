const authService = require("../services/authService");

const authenticateToken = (req, res, next) => {
  const token = req.cookies.orbitops_session;

  if (!token) {
    return res.status(401).json({
      success: false,
      error: {
        code: "NO_TOKEN",
        message: "Access token is required",
      },
    });
  }

  const decoded = authService.validateToken(token);

  if (!decoded) {
    return res.status(401).json({
      success: false,
      error: {
        code: "TOKEN_EXPIRED",
        message: "Invalid or expired token",
      },
    });
  }

  req.user = {
    companyId: decoded.companyId,
    email: decoded.email,
  };

  next();
};

const extractCompanyId = (req, res, next) => {
  if (!req.user || !req.user.companyId) {
    return res.status(401).json({
      success: false,
      error: {
        code: "INVALID_SESSION",
        message: "Valid session required",
      },
    });
  }

  req.companyId = req.user.companyId;
  next();
};

const requireAuth = [authenticateToken, extractCompanyId];

module.exports = {
  authenticateToken,
  extractCompanyId,
  requireAuth,
};
