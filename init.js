const mongoose=require('mongoose');
const Detail=require('./model/detail');

 main().then(()=>{
    console.log("mongodb connected");
 }).catch((err)=>{
    console.log(err);
 })

async function main(){
    await mongoose.connect('mongodb://127.0.0.1:27017/employee');
}

let Alldetail=[
    {
    name:"hukum",
    email:"hcgupta@cstech.in",
    mobile_no:954010044,
    designation:"HR",
    gender:"Male",
    course:"MCA",
    },
];

Detail.insertMany(Alldetail);

