const mongoose=require('mongoose');
const Schema=mongoose.Schema;

const detailSchema=new Schema({
    name:{
        type:String,
        required:true,
    },
    email:{
        type:String,
        required:true,
    },
    mobile_no:{
        type:Number,
        required:true
    },
    designation:{
        type:String,
        required:true
    },
    gender:{
        type:String,
        required:true
    },
    course:{
        type:String,
        required:true
    },
    img: {
        url: String,
        filename:String,
    },
    createdAt:{
        type:Date,
        default:Date.now(),
    },
});

const Detail=mongoose.model("Detail",detailSchema);
module.exports=Detail;