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
    const currentDay = moment().format('DD');
    const currentTime = moment().format('HH:mm');

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

        // ניתוח נתונים - המרת שורות לקובץ אובייקטים
        const records = data.split('\n').slice(1).map(line => {
            const columns = line.split(',');
            return {
                day: columns[0],
                entry: columns[1],
                exit: columns[2]
            };
        });

        // מציאת רשומה עבור היום הנוכחי
        const existingRecord = records.find(record => record.day === currentDay);
        let entryTime = '';
        let exitTime = '';

        // אם יש רשומה קיימת, נעדכן אותה
        if (existingRecord) {
            if (action === 'Entry') {
                entryTime = currentTime;
                existingRecord.entry = entryTime; // עדכון זמן כניסה
            }
            else if (action === 'Exit') {
                exitTime = currentTime;
                existingRecord.exit = exitTime; // עדכון זמן יציאה
            }
        } else {
            // אם אין רשומה עבור היום, נוסיף רשומה חדשה
            if (action === 'Entry') {
                entryTime = currentTime;
            }
            else if (action === 'Exit') {
                exitTime = currentTime;
            }

            const newRecord = {
                day: currentDay,
                entry: entryTime,
                exit: exitTime
            };

            records.push(newRecord); // הוספת הרשומה החדשה
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
            .then(() => console.log('Attendance record updated:', currentDay, action, currentTime));
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
