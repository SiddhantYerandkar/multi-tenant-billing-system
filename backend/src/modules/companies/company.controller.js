const { createCompany, getCompanyByOwner, updateCompany, getCompanyById } = require("./company.service");

const createCompanyController = async (req, res) => {
    try {
        const {
            name,
            address,
            phone,
            gst_number,
            gst_enabled,
            website,
            upi_id,
            email,
        } = req.body;

        const owner_id = req.user.id; // from auth middleware

        const logo_url = req.files?.logo?.[0]?.path || null;
        const qr_code_url = req.files?.qr?.[0]?.path || null;

        const company = await createCompany({
            name,
            address,
            phone,
            gst_number,
            gst_enabled,
            owner_id,
            website,
            logo_url,
            qr_code_url,
            upi_id,
            email,
        });

        const jwt = require("jsonwebtoken");

        const token = jwt.sign(
            {
                id: req.user.id,
                companyId: company.id,
            },
            "secretkey",
            { expiresIn: "7d" }
        );

        return res.status(201).json({
            success: true,
            message: "Company created successfully",
            data: {
                company,
                token, // 🔥 NEW TOKEN
            },
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Error creating company",
        });
    }
};

const getMyCompany = async (req, res) => {
    try {
        const company = await getCompanyByOwner(req.user.id)

        if (!company) {
            return res.status(200).json({
                success: true,
                data: null,
            })
        }

        return res.json({
            success: true,
            data: company,
        })
    } catch (err) {
        res.status(500).json({ success: false })
    }
}

// 🔥 NEW: Update company
const updateCompanyController = async (req, res) => {
    try {
        const id = req.params.id

        const logo_url = req.files?.logo?.[0]?.path
        const qr_code_url = req.files?.qr?.[0]?.path

        const updated = await updateCompany(id, {
            ...req.body,
            logo_url,
            qr_code_url,
        })

        return res.json({
            success: true,
            data: updated,
        })
    } catch (err) {
        console.error(err)
        res.status(500).json({ success: false })
    }
}

// 🔥 NEW: Get company by id
const getCompanyByIdController = async (req, res) => {
    const company = await getCompanyById(req.params.id)

    res.json({
        success: true,
        data: company,
    })
}

module.exports = { createCompanyController, getMyCompany, updateCompanyController, getCompanyByIdController };