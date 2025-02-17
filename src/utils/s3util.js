const AWS = require('aws-sdk');

const s3 = new AWS.S3();

const uploadToS3 = async (file, fileName) => {
  const params = {
    Bucket: process.env.S3_BUCKET_USERPROFILE,
    Key: fileName,
    Body: file.buffer,
    ContentType: file.mimetype,
  };

  const s3Response = await s3.upload(params).promise();
  console.log("s3Response.Location : ",s3Response.Location);
  
  return s3Response.Location;
};


module.exports = { uploadToS3 }
