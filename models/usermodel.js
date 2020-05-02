var mongoose=require('mongoose');
var passportLocalMongoose=require('passport-local-mongoose');


var userScheme= new mongoose.Schema({
	name:String,
	email:String,
    password:{
    	type:String,
    	select:false
    },
    resetPasswordToken:String,
    resetPasswordExpires:Date

});

//Fixed Statements about export and using passport with mongooose..

userScheme.plugin(passportLocalMongoose, {usernameField:'email'});
module.exports=mongoose.model('User',userScheme);