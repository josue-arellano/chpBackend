var express = require('express')
var app = express()
var bodyParser = require('body-parser')
var request = require('request')
var cheerio = require('cheerio')
var schedule = require('node-schedule')

const PORT = process.env.PORT || 5000;

const semesters = [
    'Winter',
    'Spring',
    'Summer',
    'Fall'
]
var semesterIndex = 0
var year = 2019
var courseListArray = new Array()
var today = new Date()

function checkRequest(url) {
    return new Promise((resolve, reject) => {
        request(url, (error, res, html) => {
            if(!error && res.statusCode == 200) {
                resolve(true)
            } else {
                reject(false)
            }
        })
    })
}

function getRequest(url) {
    return new Promise((resolve, reject) => {
        request(url, (error, res, html) => {
            if(!error && res.statusCode == 200) {
                resolve(html)
            } else {
                reject()
            }
        })
    })
}

var runMe = async (url, courseNumber) => {
    var html = await getRequest(url)
                        .catch((err) => {
                            console.log(err)
                        })
    var $ = cheerio.load(html)
    var course = {
        courseName: "",
        courseDesc: "",
        courseNum: "",
        daysOfWeek: "",
        meetingTime: "",
        meetingDates: ""
    }
    $('tbody').find('tr').each(function(i, elem) {
        var courseArray = []
        $(this).find('td').each(function(j, elem) {
            courseArray.push($(this).text())
        })
        if(courseArray.length == 14) {
            var courseInfo = {
                courseName: courseArray[0].substring(1, courseArray[0].length-1),
                courseDesc: courseArray[1].substring(1, courseArray[1].length-1),
                courseNum: courseArray[2].substring(1, 6),
                daysOfWeek: courseArray[4].substring(1, courseArray[4].length-1),
                meetingTime: courseArray[5].substring(1, courseArray[5].length-1),
                meetingDates: courseArray[13].substring(1, 22),
            }
            if(courseInfo.courseNum === courseNumber) {
                console.log(courseInfo);
                course = courseInfo
            }
            courseListArray.push(courseInfo)
        }
    })
    return course
}

schedule.scheduleJob({hour: 16, minute: 07}, async () => {
    var semesterExists = true
    var urlPrefix = 'http://elac.edu/academics/schedules/courselisting/class_list_'
    var testYear = today.getFullYear()
    var testURL
    var selectedURL

    while(semesterExists) {
        testURL = urlPrefix + semesters[semesterIndex] + '_' + testYear + '.htm'
        await checkRequest(testURL)
            .then(() => {
                selectedURL = testURL
            }).catch((err) => {
                semesterExists = false
            })
        if(semesterIndex === 3) {
            testYear += 1
            semesterIndex = 0
        } else {
            semesterIndex++
        }
    }
    var $

    request(selectedURL, (error, response, html) => {
        if(!error && response.statusCode == 200) {
            $ = cheerio.load(html)
            $('tbody').find('tr').each(function(i, elem) {
                var courseArray = []
                $(this).find('td').each(function(j, elem) {
                    courseArray.push($(this).text())
                })
                if(courseArray.length == 14) {
                    var courseInfo = {
                        courseName: courseArray[0].substring(1, courseArray[0].length-1),
                        courseDesc: courseArray[1].substring(1, courseArray[1].length-1),
                        courseNum: courseArray[2].substring(1, 6),
                        daysOfWeek: courseArray[4].substring(1, courseArray[4].length-1),
                        meetingTime: courseArray[5].substring(1, courseArray[5].length-1),
                        meetingDates: courseArray[13].substring(1, 22),
                    }
                    courseListArray.push(courseInfo)
                }
            })
        } else {
            console.log("There was an error")
        }
    })
})
app.use(bodyParser.json())
app.get('/', async (req, res) => {
    if(!req.query.semester) {
        res.status(400).send({
            success: 'false',
            message: 'semester required'
        })
    }
    if(!req.query.year) {
        res.status(400).send({
            success: 'false',
            message: 'year required'
        })
    }
    if(!req.query.course) {
        res.status(400).send({
            success: 'false',
            message: 'course number required'
        })
    }
    const semester = req.query.semester
    const year = req.query.year
    const response = await runMe('http://elac.edu/academics/schedules/courselisting/class_list_'+ semester + '_' + year + '.htm', req.query.course)

    console.log("done")
    console.log(response)
    res.json(response)
})
app.listen(PORT, () => {})