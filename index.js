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
        return getAll(data.cursor, employeeList);
      } else {
        return employeeList;
      }
    })
    .catch(function(error) {
      console.log(error);
    });
}

//cleans up the employee data that's returned and turns it into an object refrenced by ID
function employeeListToObject(employeeList) {
  let employeeObject = {};
  employeeList.forEach(element => {
    //data comes in details.job format with job being a variable, sometimes there's more then one job per details
    const { details } = element;
    const title = Object.keys(details);
    title.forEach(e => {
      const worker = details[e];
      employeeObject[worker.id] = worker;
    });
  });
  return employeeObject;
}

function ensureCompleteList(employeeObj) {
  for (const key in employeeObj) {
    let currEmployee = employeeObj[key];
    if (currEmployee.hasOwnProperty("reports")) {
      currEmployee.reports.forEach((e, i) => {
        if (!e.hasOwnProperty("is_reference")) {
          employeeObj[e.report.id] = e.report;
          employeeObj[key]["reports"][i] = {
            is_reference: true,
            ref_id: e.report.id
          };
        }
      });
    }
    if (currEmployee.hasOwnProperty("managed_by")) {
      const { managed_by } = currEmployee;
      //results don't seem to be standardized if they are in an array or not (ID 5035 in sample set for example)
      //this check is getting around how JS deals with arrays of objects

      if (Array.isArray(currEmployee.managed_by)) {
        managed_by.forEach((e, i) => {
          if (!e.hasOwnProperty("is_reference")) {
            employeeObj[e.id] = e;
            employeeObj[key]["managed_by"][i] = {
              is_reference: true,
              ref_id: e.id
            };
          }
        });
      } else {
        if (!managed_by.hasOwnProperty("is_reference")) {
          employeeObj[managed_by.id] = managed_by;

          employeeObj[key]["managed_by"] = {
            is_reference: true,
            ref_id: managed_by.id
          };
        }
      }
    }
  }
  return employeeObj;
}

getAll().then(test => {
  let employeeObj = employeeListToObject(test);
  employeeObj = ensureCompleteList(employeeObj);
  console.log(employeeObj);
  debugger;
});
