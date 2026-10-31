import Company from "../models/company.model.js";
import User from "../models/user.model.js";

// create the company controller method POST /api/company/create
export const createCompany = async (req, res) => {
  try {
    const userId = req.userId;

    const user = await User.findOne({ _id: userId }).select("-password");

    if (!user) {
      return res.status(404).json({
        message: "Please sign in to continue",
      });
    }

    const { name, email, country, baseCurrency, address, settings, status } =
      req.body;

    if (!name || !email || !country) {
      return res.status(409).json({
        message: "All fields are required",
      });
    }

    const company = await Company.create({
      name,
      ownerId: userId,
      email,
      country,
      baseCurrency,
      address,
      settings,
      status,
    });

    user.companyId = company._id;
    await user.save();

    // const populatedCompany = await Company.findById(company._id).populate("ownerId", "-password")

    return res.status(201).json({
      message: "Company created successfully",
      company,
    });
  } catch (error) {
    console.log(`Create company error : ${error.message}`);
  }
};

// get my company methods GET /api/company/me
export const getMyCompany = async (req, res) => {
  try {
    const userId = req.userId;

    const user = await User.findById(userId);

    if (!userId || !user) {
      return res.status(400).json({
        message: "Please sign in first",
      });
    }

    const company = await Company.findOne({ ownerId: userId });

    return res.status(200).json({
      message: "Company found successfully",
      company,
    });
  } catch (error) {
    console.log(`Get my company error : ${error.message}`);
    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

// update the company details
export const updateCompanyDetails = async (req, res) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        message: "Please sign in first",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(401).json({
        message: "User not found. Please sign in again.",
      });
    }

    const { name, email, country, baseCurrency, address } = req.body;

    const company = await Company.findOne({ ownerId: userId });

    if (!company) {
      return res.status(404).json({
        message: "Create a company first",
      });
    }

    // Update basic company details only when provided
    if (typeof name === "string" && name.trim() !== "") {
      company.name = name.trim();
    }

    if (typeof email === "string" && email.trim() !== "") {
      company.email = email.trim();
    }

    if (typeof country === "string" && country.trim() !== "") {
      company.country = country.trim();
    }

    if (typeof baseCurrency === "string" && baseCurrency.trim() !== "") {
      company.baseCurrency = baseCurrency.trim();
    }

    // Ensure the address object exists
    if (!company.address) {
      company.address = {
        street: "",
        city: "",
        state: "",
        postalCode: "",
      };
    }

    // Update address fields only if valid values are provided
    if (address && typeof address === "object" && !Array.isArray(address)) {
      const addressFields = ["street", "city", "state", "postalCode"];

      for (const field of addressFields) {
        if (
          typeof address[field] === "string" &&
          address[field].trim() !== ""
        ) {
          company.address[field] = address[field].trim();
        }
      }
    }

    await company.save();

    return res.status(200).json({
      message: "Company details updated successfully",
      company,
    });
  } catch (error) {
    console.error("Update company error:", error.stack || error.message);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

// approval and automatic payout approval prefrences
export const updatePayoutPreferences = async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId).select("-password");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const company = await Company.findOne({ ownerId: userId });

    if (!company) {
      return res.status(400).json({
        message: "Create a company first",
      });
    }

    const { settings } = req.body;

    if (!company.settings) {
      company.settings = {
        payrollApprovalRequired: "",
        defaultPaymentProvider: "",
        automaticPayoutEnabled: "",
      };
    }

    if (settings && typeof settings === "object" && !Array.isArray(settings)) {
      const settingsFields = [
        "payrollApprovalRequired",
        "defaultPaymentProvider",
        "automaticPayoutEnabled",
      ];

      for (const field of settingsFields) {
        if (settings[field] !== undefined) {
          company.settings[field] = settings[field];
        }
      }
    }
    await company.save();

    return res.status(200).json({
      message: "Payout settings updated",
      company,
    });
  } catch (error) {
    console.log(`update payout prefrences error : ${error.message}`);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};
