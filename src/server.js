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
const csvFileName = 'attendance.csv';

// פונקציה לעדכון דוח הנוכחות
function logAttendance(action) {
    const currentDate = moment().format('YYYY-MM-DD');
    const currentTime = moment().format('HH:mm:ss');

    // אם הקובץ לא קיים, ניצור אותו
    if (!fs.existsSync(csvFileName)) {
        const csvWriter = createObjectCsvWriter({
            path: csvFileName,
            header: [
                { id: 'date', title: 'תאריך' },
                { id: 'action', title: 'פעולה' },
                { id: 'time', title: 'שעה' }
            ]
        });
        csvWriter.writeRecords([]); // כותבים רשומות ראשוניות ריקות
    }

    // קריאה לקובץ CSV
    const csvWriter = createObjectCsvWriter({
        path: csvFileName,
        append: true, // מאפשר להוסיף שורות מבלי למחוק את הקובץ
        header: [
            { id: 'date', title: 'תאריך' },
            { id: 'action', title: 'פעולה' },
            { id: 'time', title: 'שעה' }
        ]
    });

    // כתיבת המידע לקובץ
    csvWriter.writeRecords([{ date: currentDate, action: action, time: currentTime }])
        .then(() => console.log('Record added:', currentDate, action, currentTime));
}

// נתיב עבור כפתור "כניסה"
app.post('/entry', (req, res) => {
    logAttendance('כניסה');
    res.send('כניסה תועדה');
});

// נתיב עבור כפתור "יציאה"
app.post('/exit', (req, res) => {
    logAttendance('יציאה');
    res.send('יציאה תועדה');
});

// נתיב להורדת דוח נוכחות (הצגת דוח)
app.get('/report', (req, res) => {
    res.sendFile(path.join(__dirname, csvFileName));
});

// אתחול השרת
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
