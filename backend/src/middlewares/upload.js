const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

const storage = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => {
        let folder = "companies";

        if (file.fieldname === "logo") {
            folder = "companies/logos";
        } else if (file.fieldname === "qr") {
            folder = "companies/qr";
        }

        return {
            folder,
            resource_type: "image",
        };
    },
});

const upload = multer({ storage });

module.exports = upload;