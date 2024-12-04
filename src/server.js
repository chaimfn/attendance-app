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
    const currentDay = moment().format('DD'); // מספר היום בחודש
    const currentWeekday = moment().format('ddd'); // שם היום בשבוע
    const currentTime = moment().format('HH:mm'); // זמן בלי שניות (רק שעה ודקה)

    // אם הקובץ לא קיים, ניצור אותו עם כותרות ראשוניות
    if (!fs.existsSync(csvFileName)) {
        const csvWriter = createObjectCsvWriter({
            path: csvFileName,
            header: [
                { id: 'dayOfMonth', title: 'DayOfMonth' },  // היום בחודש
                { id: 'dayOfWeek', title: 'DayOfWeek' },    // היום בשבוע
                { id: 'entry', title: 'Entry' },             // כניסה
                { id: 'exit', title: 'Exit' }                // יציאה
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
                dayOfMonth: columns[0],
                dayOfWeek: columns[1],
                entry: columns[2],
                exit: columns[3]
            };
        });

        // פורמט של היום, כולל היום בשבוע
        const formattedDayOfMonth = `${currentDay}`;
        const formattedDayOfWeek = `${currentWeekday}`;

        // אם יש רשומת כניסה פתוחה (שאין יציאה בשלב זה)
        const existingEntry = records.find(record => record.dayOfMonth === formattedDayOfMonth && record.entry !== '' && record.exit === '');

        if (action === 'Entry') {
            if (existingEntry) {
                // אם יש כניסה פתוחה, לא נוסיף שורה חדשה
                console.log('Entry already recorded for today:', formattedDayOfMonth, formattedDayOfWeek);
            } else {
                // אם לא קיימת כניסת יום, נוסיף כניסה חדשה בשורה נפרדת
                const newRecord = {
                    dayOfMonth: formattedDayOfMonth,
                    dayOfWeek: formattedDayOfWeek,
                    entry: currentTime,
                    exit: ''
                };
                records.push(newRecord);
                console.log('Entry recorded for today:', formattedDayOfMonth, formattedDayOfWeek, currentTime);
            }
        } else if (action === 'Exit') {
            if (existingEntry) {
                // אם יש כניסה פתוחה, נוסיף את זמן היציאה באותה שורה
                existingEntry.exit = currentTime;
                console.log('Exit recorded for today:', formattedDayOfMonth, formattedDayOfWeek, currentTime);
            } else {
                // אם אין כניסת יום פתוחה, נוסיף יציאה בשורה חדשה
                const newRecord = {
                    dayOfMonth: formattedDayOfMonth,
                    dayOfWeek: formattedDayOfWeek,
                    entry: '',
                    exit: currentTime
                };
                records.push(newRecord);
                console.log('Exit recorded for today (without entry):', formattedDayOfMonth, formattedDayOfWeek, currentTime);
            }
        }

        // כותבים את הרשומות המעודכנות חזרה לקובץ CSV
        const csvWriter = createObjectCsvWriter({
            path: csvFileName,
            header: [
                { id: 'dayOfMonth', title: 'DayOfMonth' },  // היום בחודש
                { id: 'dayOfWeek', title: 'DayOfWeek' },    // היום בשבוע
                { id: 'entry', title: 'Entry' },             // כניסה
                { id: 'exit', title: 'Exit' }                // יציאה
            ]
        });

        csvWriter.writeRecords(records)
            .then(() => console.log('Attendance record updated:', formattedDayOfMonth, formattedDayOfWeek, action, currentTime));
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
