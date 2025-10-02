const express=require('express'); 
const {getMe}=require('../controllers/me.controller'); 
const meRouter=express.Router(); 

meRouter.get('/',getMe); module.exports={meRouter};
