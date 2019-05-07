const axios = require("axios");

const apiUrl = "https://promise-hiring.appspot.com/employees";

let employeeList = [];

//helper function to avoid rate limiting
const delay = interval => new Promise(resolve => setTimeout(resolve, interval));

async function getAll(cursorStr = "") {
  return axios
    .get(apiUrl, {
      params: {
        //defaults to blank string but is used each recursion
        cursor: cursorStr
      }
    })
    .then(async function(response) {
      const { data } = response;
      employeeList.push(data.employees);
      if (data.cursor) {
        //there is a rate limiter on the api
        await delay(1000);
        return getAll(data.cursor);
      }
    })
    .catch(function(error) {
      console.log(error);
    });
}
getAll().then(() => {
  debugger;
});
