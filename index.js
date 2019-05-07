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
      employeeObj[key].is_manager = true;
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
      //since this only happens once I am assuming it is a mistake in the orginal data set
      if (Array.isArray(currEmployee.managed_by)) {
        employeeObj[key]["managed_by"] = currEmployee.managed_by[0];
      } else {
        if (!managed_by.hasOwnProperty("is_reference")) {
          employeeObj[managed_by.id] = managed_by;
          employeeObj[managed_by.id]["is_manager"] = true;
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

function standardizeManagers(employeeObj) {
  for (const key in employeeObj) {
    let employee = employeeObj[key];
    if (employee.hasOwnProperty("reports")) {
      employee.reports.forEach(e => {
        let childCheck = employeeObj[e.ref_id];
        //need to double check this for data
        if (e.ref_id === 5050) {
          return;
        }
        if (!childCheck.hasOwnProperty("managed_by")) {
          childCheck["managed_by"] = {};
        }
        childCheck.managed_by = {
          is_reference: true,
          ref_id: Number(key)
        };
      });
    }
    if (employee.hasOwnProperty("managed_by")) {
      let parentCheck = employeeObj[employee.managed_by.ref_id];
      if (!parentCheck.hasOwnProperty("reports")) {
        parentCheck["reports"] = [];
      }
      let found = false;
      parentCheck.reports.forEach(e => {
        if (e.ref_id == key) {
          found = true;
        }
      });
      if (!found) {
        parentCheck.reports.push({
          is_reference: true,
          ref_id: Number(key)
        });
      }
    }
    if (employee.hasOwnProperty("team_members")) {
      employee.team_members.forEach(e => {
        const teamID = e.ref_id;
        if (!employee.hasOwnProperty("managed_by")) {
          employee.managed_by = employeeObj[teamID].managed_by;
          let parentCheck = employeeObj[employee.managed_by.ref_id];
          if (!parentCheck.hasOwnProperty("reports")) {
            parentCheck["reports"] = [];
          }
          let found = false;
          parentCheck.reports.forEach(e => {
            if (e.ref_id == key) {
              found = true;
            }
          });
          if (!found) {
            parentCheck.reports.push({
              is_reference: true,
              ref_id: Number(key)
            });
          }
        }
        if (!employeeObj[teamID].hasOwnProperty("managed_by")) {
          employeeObj[teamID].managed_by = employee.managed_by;
          let parentCheck = employeeObj[employee.managed_by.ref_id];
          if (!parentCheck.hasOwnProperty("reports")) {
            parentCheck["reports"] = [];
          }
          let found = false;
          parentCheck.reports.forEach(e => {
            if (e.ref_id == teamID) {
              found = true;
            }
          });
          if (!found) {
            parentCheck.reports.push({
              is_reference: true,
              ref_id: Number(teamID)
            });
          }
        }
      });
    }
  }
  return employeeObj;
}

function constructHeirarchy(employeeObj) {
  let top;
  for (const key in employeeObj) {
    if (!employeeObj[key].hasOwnProperty("managed_by") && employeeObj[key].hasOwnProperty("reports")) {
      top = {
        id: employeeObj[key].id,
        email: employeeObj[key].email,
        reports: employeeObj[key].reports
      };
    }
  }
  return insertReports(employeeObj,top.id);
}

function insertReports(employeeObj, employeeID) {
  if(employeeID===5050){
    return
  }
  console.log(employeeObj[employeeID])
  let newObj = {
    id: employeeID,
    email: employeeObj[employeeID].email,
  };
  if(employeeObj[employeeID].hasOwnProperty('reports')){
    newObj.reports = employeeObj[employeeID].reports.map(e=>{
      return insertReports(employeeObj, e.ref_id)
    })
  }
  return newObj
}

getAll().then(test => {
  let employeeObj = employeeListToObject(test);
  employeeObj = ensureCompleteList(employeeObj);
  employeeObj = standardizeManagers(employeeObj);
  console.log(constructHeirarchy(employeeObj));
  debugger;
});
