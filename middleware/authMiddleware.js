// const jwt = require('jsonwebtoken');

// const authenticateToken = (req, res, next) => {
//   const token = req.cookies.auth_token  || req.headers.authorization?.split(" ")[1];; 


  


//   if (!token) {
//     return res.status(401).json({ message: 'Not authenticated' });
//   }

//   jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
//     if (err) return res.status(403).json({ message: 'Invalid token' });

//     req.user = user; 
//     next();
//   });
// };

// module.exports = authenticateToken;

const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const token = req.cookies.auth_token || req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid token' });
    }

    req.user = decoded; // ✅ This will give access to decoded.id, decoded.email, etc.
    next();
  });
};

module.exports = authenticateToken;