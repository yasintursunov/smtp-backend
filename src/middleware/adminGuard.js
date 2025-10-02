function adminGuard(req,res,next){ 
    if(req.userRole==='admin') 
        return next(); 
    return res.status(403).json({code:'FORBIDDEN',message:'Admin only'});} module.exports={adminGuard};
