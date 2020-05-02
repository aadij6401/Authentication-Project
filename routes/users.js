var express=require('express');
var router=express.Router();
var passport=require('passport');
var User=require('../models/usermodel');
var crypto=require('crypto');
var async=require('async');
var nodeMailer=require('nodemailer');

function isAuthenticatedUser(req,res,next){
	if(req.isAuthenticated())
	{
		return next();
	}
	req.flash('error_msg','Please Login To Access This Page');
	res.redirect('/login');
}



router.get('/login',(req,res)=>{
	res.render('login');
});

router.get('/signup',(req,res)=>{
	res.render('signup');
});

router.get('/dashboard',isAuthenticatedUser,(req,res)=>{
	res.render('dashboard');
});

router.get('/logout',(req,res)=>{
	req.logOut();
	req.flash('success_msg','You Have Successfully Logged Out.');
	res.redirect('/login');
});

router.get('/forgot',(req,res)=>{
	res.render('forgot');
});

router.get('/reset/:token',(req,res)=>{
    
	User.findOne({resetPasswordToken: req.params.token , resetPasswordExpires:{$gt:Date.now()} })
	   .then(user=>{
           if(!user)
           {
           	  req.flash('error_msg','Time got out or Expired. Retry');
           	  res.redirect('/forgot');
           } 
           res.render('newpassword',{token:req.params.token});
	   })
	   .catch(err=>{
	   	req.flash('error_msg','Error'+err);
	   	res.redirect('/forgot');
	   });
});

router.get('/password/change',(req,res)=>{
	res.render('changepassword');
})



router.post('/login',passport.authenticate('local',{
	successRedirect:'/dashboard',
	failureRedirect:'/login',
	failureFlash:'Invalid Email or Password. Please Try Again.'
}));


router.post('/signup',(req,res)=>{
	//Req.body :- Used to pick the data from the form.
	 var {name,email,password}=req.body;
	
	var userData={
		name:name,
		email:email
	};

    User.register(userData,password,(err,user)=>{
        if(err)
        {
        	req.flash('error_msg','ERROR: '+err);
        	res.redirect('/signup');
        }
        //authenticate(connection, credentials, callback)//
        passport.authenticate('local') (req,res,()=>{
             req.flash('success_msg','Account created Successfully.');
             res.redirect('/dashboard');
        });
    });
});

//Routes to handle to forgot password functionality.
router.post('/forgot',( req ,res ,next)=>{
      
     var recoveryPassword='';
     //Performs a Sequence of Action on array of Functions...
     async.waterfall([
       //This method is used to generate the token for user which is requesting the change of password.
       (done)=>{
       	//Generates strong pseudo-random bytes.
       	 crypto.randomBytes(20,(err,buf)=>{
             //Generating Token or Id for that User who has requested.
             var token=buf.toString('hex');
             done(err,token);
       	 });
       },
       //This method is used to find the user in the database  
       (token,done)=>{
       	   User.findOne({email:req.body.email})
       	       .then(user=>{
       	       	  if(!user)
       	       	  {
       	       	  	req.flash('error_msg','User Does not Exist WIth This Email');
       	       	  	return res.redirect('/forgot');
       	       	  }
       	       	  //Allocates a time for which the link will be activated.
       	       	  user.resetPasswordToken=token; 
       	       	  user.resetPasswordExpires=Date.now() + 1800000; //30 minutes from current time.
       	          //Save the session data with optional callback `fn(err)`.
       	          user.save(err=>{
       	          	done(err,token,user);
       	          });
       	       })
       	       .catch(err=>{
       	       	req.flash('error_msg','Error'+err);
       	       	res.redirect('/forgot');
       	       })
       },
       (token,user)=>{
       	var smtpTransport=nodeMailer.createTransport({
       		//Extension which we will be using for sending mails...
       		service:'gmail',
       		auth:{
       			user:process.env.GMAIL_EMAIL,
       			pass:process.env.GMAIL_PASSWORD
       		}
       	});
       	//Complete Description of E-mail which the user will recieve.
        var mailOptions={
            to: user.email,
            from:'Creator Of Authentication App.',
            subject:'Recovery Email From Authentication Project',
            text:'Please Click The following link for resetting your forgot password: \n\n'+
                 'http://'+req.headers.host+'/reset/'+token+'\n\n'+
                 'If you did not requested this , Please report.'
        };
        //This method performs the operation which is mentioned in the callback upon the successfull completion of the mentioned object.
        smtpTransport.sendMail(mailOptions,err=>{
            req.flash('success_msg','Email sent with further instructions.');
            res.redirect('/login');
        });
       }
     ]
     ,err=>{
        if(err)
        {
        	res.redirect('/forgot');
        }
     });

});


router.post('/reset/:token',(req,res)=>{
	async.waterfall([
      (done)=>{
        User.findOne({resetPasswordToken: req.params.token , resetPasswordExpires:{$gt:Date.now()} })
           .then(user=>{
           	   if(!user)
           {
           	  req.flash('error_msg','Try Again.');
           	  res.redirect('/forgot');
           } 

               if(req.body.password!==req.body.confirmpassword)
               {
               	  req.flash('error_msg',"Passwords Don't Match. Try Again.")
               	  return res.redirect('/forgot');
               }
               // Here the set password which is used , is an in-built function for setting the password parameter.
               user.setPassword(req.body.password,err=>{
               	    //Here both the parameters are set undefined once the password is reseted because this could cause a problem in security.
               	    resetPasswordToken=undefined;
               	    resetPasswordExpires=undefined;
                    user.save(err=>{
                     	req.logIn(user,err=>{
               		    done(err,user);
               	             });
                     })
               })
               
           })
           .catch(err=>{
           	req.flash('error_msg','Error'+err);
           	res.redirect('/forgot');
           })      
      },
      (user)=>{
      	var smtpTransport=nodeMailer.createTransport({
       		//Extension which we will be using for sending mails...
       		service:'Gmail',
       		auth:{
       			user:process.env.GMAIL_EMAIL,
       			pass:process.env.GMAIL_PASSWORD
       		}
          })
       var mailOptions={
            to: user.email,
            from:'msd201107@gmail.com',
            subject:'Successfully Changed Password Confirmation',
            text:'Congratulations,'+user.name+' on Successfully Changing Your Password for account '+user.email
        };
         smtpTransport.sendMail(mailOptions,err=>{
            req.flash('success_msg','Password Changed Successfully');
            res.redirect('/dashboard');
        });
      }

	]),err=>{
		res.redirect('/login');
	}
});

router.post('/password/change',(req,res)=>{
     
     if(req.body.password!==req.body.confirmpassword)
               {
               	  req.flash('error_msg',"Passwords Don't Match. Try Again.")
               	  return res.redirect('/password/change');
               }

     User.findOne({email:req.user.email})
         .then(user=>{
          user.setPassword(req.body.password,err=>{
          	     user.save()
          	        .then(user=>{
                       req.flash('success_msg','Password Changed Successfully.');
                       res.redirect('/dashboard');              	
                    })
                    .catch(err=>{
                    	req.flash('error_msg','Error'+err);
                    	res.redirect('/dashboard');
                    })
          })
        })
         // .catch(err=>{
         // 	req.flash('error_msg','Error:-'+err);
         // })
});

module.exports=router;
