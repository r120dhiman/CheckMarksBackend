const User=require('../models/User')
const { oauth2client } = require("../utils/googleConfig");
const axios = require('axios');
const jwt = require('jsonwebtoken');

const GoogleLogin = async (req, res) => {
  try {
    const { code } = req.query;

    const Userdata = await oauth2client.getToken(code);
    oauth2client.setCredentials(Userdata.tokens);
    console.log(Userdata);
    const UserRes = await axios.get(`https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${Userdata.tokens.access_token}`);
console.log(UserRes.data);
    const { name, email, picture } = UserRes.data;
    let user = await User.findOne({ email });
if(user){
  const {_id, email}=user;
  const token = jwt.sign({ _id, email }, process.env.JWT_SECRET);
  return res.status(200).json({ message: 'Success', user, token });
}
    else  {
      user = await User.create({ name, email, image: picture });
    }
    console.log(user);
    const { _id } = user;
    const token = jwt.sign({ _id, email }, process.env.JWT_SECRET);
    console.log(token);
    return res.status(200).json({ message: 'Success', user, token });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

module.exports = { GoogleLogin };