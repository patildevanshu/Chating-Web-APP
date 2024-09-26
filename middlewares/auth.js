const isLogin = async (req, res, next) => {

    try {
        if (req.session.user) {
            
        } else {
            res.redirect('/');
        }
        next();
    } catch (error) {
        console.error(error.message);
    }

};

const isLogout = async (req, res, next) => {

    try {
        if (req.session.user) {
            res.redirect('/dashboard');   
        }
        next();
    } catch (error) {
        console.error(error.message);
    }

};

module.exports = {
    isLogin,
    isLogout
};