const axios = require("axios");

const apiUrl = "https://promise-hiring.appspot.com/employees";



//helper function to avoid rate limiting
const delay = interval => new Promise(resolve => setTimeout(resolve, interval));

async function getAll(cursorStr = "", employeeList = []) {
  return axios
    .get(apiUrl, {
      params: {
        //defaults to blank string but is used each recursion
        cursor: cursorStr
      }
    })
    .then(async function(response) {
      const { data } = response;
      employeeList.push(...data.employees);
      if (data.cursor) {
        //there is a rate limiter on the api
        await delay(1000);
        return getAll(data.cursor,employeeList);
      }
      else{
        return employeeList
      }
    })
    .catch(function(error) {
      console.log(error);
    });
}
getAll().then((test) => {
  console.log(test)
  debugger
});


// function employeeListToObject(employeeList){
//   let employeeObject ={};
//   employeeList.forEach(element => {
    
//   });
// }