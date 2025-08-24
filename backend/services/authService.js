const jwt = require("jsonwebtoken");
const Company = require("../models/company");

class AuthService {
  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || "your-secret-key";
    this.tokenExpiry = "24h";
  }

  generateToken(payload) {
    return jwt.sign(payload, this.jwtSecret, { expiresIn: this.tokenExpiry });
  }

  validateToken(token) {
    try {
      return jwt.verify(token, this.jwtSecret);
    } catch (error) {
      return null;
    }
  }

  async login(email, password) {
    if (!email || !password) {
      throw new Error("Email and password are required");
    }

    const company = await Company.findOne({ email });

    if (!company) {
      throw new Error("Email not registered");
    }

    if (company.password !== password) {
      throw new Error("Invalid credentials");
    }

    const tokenPayload = {
      companyId: company.companyId,
      email: company.email,
    };

    const token = this.generateToken(tokenPayload);

    return {
      token,
      user: {
        companyId: company.companyId,
        companyName: company.name,
        email: company.email,
      },
    };
  }

  async refreshToken(token) {
    const decoded = this.validateToken(token);

    if (!decoded) {
      return null;
    }

    const company = await Company.findOne({ companyId: decoded.companyId });
    if (!company) {
      return null;
    }

    const newTokenPayload = {
      companyId: decoded.companyId,
      email: decoded.email,
    };

    return this.generateToken(newTokenPayload);
  }

  async logout(token) {
    const decoded = this.validateToken(token);
    return decoded !== null;
  }
}

module.exports = new AuthService();
