const express = require('express');
const fs = require('fs');
const path = require('path');
const moment = require('moment');
const { createObjectCsvWriter } = require('csv-writer');

const app = express();
const port = 3000;

app.use(express.static('public')); // הגדרת תיקיית הסטטיים
app.use(express.json()); // תמיכה בקלט JSON

// שם הקובץ שהאפליקציה תכתוב אליו
const currentMonth = moment().format('YYYY-MM');
const csvFileName = `./data/${currentMonth}.csv`;

// פונקציה לעדכון דוח הנוכחות
function logAttendance(action) {
    const currentDay = moment().format('DD'); // מספר היום
    const currentWeekday = moment().format('ddd'); // שם היום בשבוע
    const currentTime = moment().format('HH:mm'); // זמן בלי שניות (רק שעה ודקה)

    // עיצוב היום בשבוע בצורה: "04 - ראשון" (יום + היום בשבוע)
    const formattedDay = `${currentDay} - ${currentWeekday}`;

    // אם הקובץ לא קיים, ניצור אותו עם כותרות ראשוניות
    if (!fs.existsSync(csvFileName)) {
        const csvWriter = createObjectCsvWriter({
            path: csvFileName,
            header: [
                { id: 'day', title: 'Day' },
                { id: 'entry', title: 'Entry' },
                { id: 'exit', title: 'Exit' }
            ]
        });
        csvWriter.writeRecords([]); // כותבים רשומות ראשוניות ריקות
    }

    // קריאה לקובץ CSV
    fs.readFile(csvFileName, 'utf8', (err, data) => {
        if (err) throw err;

        // קריאת רשומות קיימות מהקובץ
        const records = data.split('\n').slice(1).map(line => {
            const columns = line.split(',');
            return {
                day: columns[0],
                entry: columns[1],
                exit: columns[2]
            };
        });

        // בדיקה אם יש כבר רשומה עם כניסה לאותו יום
        const existingRecord = records.find(record => record.day === formattedDay && record.entry !== '' && record.exit === '');

        if (action === 'Entry') {
            if (existingRecord) {
                // אם קיימת רשומת כניסה ללא יציאה, לא נעשה דבר (הכניסה כבר רשומה).
                console.log('Entry already recorded for today:', formattedDay);
            } else {
                // אם לא קיימת כניסת יום, נוסיף כניסה חדשה
                const newRecord = {
                    day: formattedDay,
                    entry: currentTime,
                    exit: ''
                };
                records.push(newRecord);
                console.log('Entry recorded for today:', formattedDay, currentTime);
            }
        } else if (action === 'Exit') {
            if (existingRecord) {
                // אם קיימת כניסת יום, נוסיף את זמן היציאה באותה שורה
                existingRecord.exit = currentTime;
                console.log('Exit recorded for today:', formattedDay, currentTime);
            } else {
                // אם אין כניסת יום, נוסיף שורה עם יציאה בלבד
                const newRecord = {
                    day: formattedDay,
                    entry: '',
                    exit: currentTime
                };
                records.push(newRecord);
                console.log('Exit recorded for today (without entry):', formattedDay, currentTime);
            }
        }

        // כותבים את הרשומות המעודכנות חזרה לקובץ CSV
        const csvWriter = createObjectCsvWriter({
            path: csvFileName,
            header: [
                { id: 'day', title: 'Day' },
                { id: 'entry', title: 'Entry' },
                { id: 'exit', title: 'Exit' }
            ]
        });

        csvWriter.writeRecords(records)
            .then(() => console.log('Attendance record updated:', formattedDay, action, currentTime));
    });
}

// נתיב עבור כפתור "Entry"
app.post('/entry', (req, res) => {
    logAttendance('Entry');
    res.send('Entry תועדה');
});

// נתיב עבור כפתור "Exit"
app.post('/exit', (req, res) => {
    logAttendance('Exit');
    res.send('Exit תועדה');
});

// נתיב להורדת דוח נוכחות (הצגת דוח)
app.get('/report', (req, res) => {
    res.sendFile(path.join(__dirname, csvFileName));
});

// אתחול השרת
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
