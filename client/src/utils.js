export const removeDuplicateUsers = (usersArray, field) => {
   const newUserArray = [];
   usersArray.forEach((user) => {
      if (typeof user[field] !== 'string') {
         newUserArray.push(user);
      }
   });
   return newUserArray;
};
