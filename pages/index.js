import { useEffect, useState } from 'react';
import initSqlJs from 'sql.js';

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { tr } from 'date-fns/locale';
import PlusSignIcon from '../icon'; 

export default function Home() {
  const [db, setDb] = useState(null);
  const [data, setData] = useState([]);
  const [name, setName] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [daysRemaining, setDaysRemaining] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    const initDb = async () => {
      const SQL = await initSqlJs({ locateFile: file => `https://sql.js.org/dist/${file}` });
      
      let db;
      const savedDbBlob = localStorage.getItem('sqliteDb');
      
      if (savedDbBlob) {
        const uint8Array = new Uint8Array(JSON.parse(savedDbBlob));
        db = new SQL.Database(uint8Array);
      } else {
        db = new SQL.Database();
        db.run('CREATE TABLE IF NOT EXISTS test (id INTEGER PRIMARY KEY, name TEXT, date TEXT, enddate TEXT);');
        saveDb(db);
      }
      
      setDb(db);
      const result = db.exec('SELECT * FROM test;');
      if (result && result.length > 0 && result[0].values) {
        setData(result[0].values);
      } else {
        setData([]);
      }
    };
    
    initDb();
  }, []);

  const saveDb = (db) => {
    const data = db.export();
    const blob = new Blob([data], { type: 'application/octet-stream' });
    const reader = new FileReader();

    reader.onload = () => {
      localStorage.setItem('sqliteDb', JSON.stringify(Array.from(new Uint8Array(reader.result))));
    };

    reader.readAsArrayBuffer(blob);
  };

  const addName = (e) => {
    e.preventDefault();
    if (db) {
      db.run(`INSERT INTO test (name, date, enddate) VALUES (?, ?, ?);`, [name, selectedDate, daysRemaining]);
      const result = db.exec('SELECT * FROM test;');
      if (result && result.length > 0 && result[0].values) {
        setData(result[0].values);
      } else {
        setData([]);
      }
      setName('');
      setSelectedDate('');
      setDaysRemaining(null);
      saveDb(db);
      setDialogOpen(false); // Dialog'u kapat
    }
  };

  const deleteRow = (id) => {
    if (db) {
      db.run(`DELETE FROM test WHERE id = ?;`, [id]);

      const result = db.exec('SELECT * FROM test;');
      if (result && result.length > 0 && result[0].values) {
        setData(result[0].values);
      } else {
        setData([]);
      }

      saveDb(db);
    }
  };

  const handleDateChange = (date) => {
    if (date) {
      const localDate = new Date(date);
      const formattedDate = localDate.toLocaleDateString('en-CA'); // YYYY-MM-DD formatında tarih
      setSelectedDate(formattedDate);

      // Bugünün tarihi
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Seçilen tarihe dönüştür
      const selected = new Date(formattedDate);
      selected.setHours(0, 0, 0, 0);

      // Kalan gün sayısını hesapla
      const diffTime = selected - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // Gün cinsinden fark

      setDaysRemaining(diffDays);
    } else {
      setSelectedDate('');
      setDaysRemaining(null);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      if (data.length > 0) {
        const today = new Date();
        const updatedData = data.map(([id, name, date, daysRemaining]) => {
          const selectedDate = new Date(date);
          const diffTime = selectedDate - today;
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return [id, name, date, diffDays];
        });
        setData(updatedData);
      }
    }, 1000); // Her saniye güncelleme

    return () => clearInterval(interval); // Temizlik yap
  }, [data]);

  return (
    <div style={{ margin: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '90vh' }}>
      <div style={{ border: '1px solid #e2e8f0', borderRadius: 10 }}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ürün adı</TableHead>
              <TableHead>Bitiş</TableHead>
              <TableHead>Kalan Gün</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map(([id, name, date, daysRemaining]) => (
              <TableRow key={id}>
                <TableCell>{name}</TableCell>
                <TableCell>{date}</TableCell>
                <TableCell>{daysRemaining}</TableCell>
                <TableCell className="text-right">
                  <Button onClick={() => deleteRow(id)}>Sil</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger style={{ border: '1px solid black', padding:5, borderRadius: 100 }} onClick={() => setDialogOpen(true)}> <PlusSignIcon style={{ color: 'black', width: 25, height: 25 }} /></DialogTrigger>
          <DialogContent>
            <span>Ürün adı</span>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <span>Seçilen Tarih: {selectedDate || 'Seçim yapılmadı'}</span>
            <span>Kalan Gün: {daysRemaining !== null ? daysRemaining : 'Bilgi Yok'}</span>
            <Calendar
              mode="single"
              locale={tr}
              className="rounded-md border"
              selected={selectedDate ? new Date(selectedDate) : null}
              onSelect={handleDateChange}
            />
            <Button onClick={addName}>Kaydet</Button>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
