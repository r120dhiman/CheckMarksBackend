const mongoose=require('mongoose');

const connectDB= (url) => {
    mongoose.connect(url).then(() => {
      console.log("DB connected");
    }
    ).catch((error ) => {
      console.log(error);
    }
    )
  
}

module.exports={connectDB}
