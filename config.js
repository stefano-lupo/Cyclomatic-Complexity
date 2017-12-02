import dotenv from 'dotenv';
dotenv.config();


const workers = {
  home: [

    // Desktop
    {
      ip: 'http://localhost:5001',
      machine: 'Desktop quad core i7 workstation (port 5001)',
      online: false
    },
    {
      ip: 'http://localhost:5002',
      machine: 'Desktop quad core i7 workstation (port 5002)',
      online: false
    },
    {
      ip: 'http://localhost:5003',
      machine: 'Desktop quad core i7 workstation (port 5003)',
      online: false
    },
    {
      ip: 'http://localhost:5004',
      machine: 'Desktop quad core i7 workstation (port 5004)',
      online: false
    },

    // Laptop
    { ip: 'http://192.168.1.17:5001',
      machine: "Crappy dual core i5 Laptop (Port 5001)",
      online: false
    },
    { ip: 'http://192.168.1.17:5002',
      machine: "Crappy dual core i5 Laptop (Port 5002)",
      online: false
    },
    { ip: 'http://192.168.1.17:5003',
      machine: "Crappy dual core i5 Laptop (Port 5003)",
      online: false
    },
    { ip: 'http://192.168.1.17:5004',
      machine: "Crappy dual core i5 Laptop (Port 5004)",
      online: false
    },

    // EC2
    {
      ip: 'http://34.248.185.70:5001',
      machine: 'Micro EC2 Instance (on WAN - 5001)',
      online: false
    },
    {
      ip: 'http://34.248.185.70:5002',
      machine: 'Micro EC2 Instance (on WAN - 5002)',
      online: false
    },

    // Raspberry Pi
    {
      ip: 'http://192.168.1.4:5009',
      machine: 'Raspberry Pi 3',
      online: false
    }
  ],


  ec2: [

    // EC2
    {
      ip: 'http://localhost:5001',
      machine: 'Micro EC2 Instance (Local - 5001)',
      online: false
    },
    {
      ip: 'http://localhost:5002',
      machine: 'Micro EC2 Instance (Local - 5002)',
      online: false
    },

    // Raspberry Pi
    {
      ip: 'http://86.43.98.198:5009',
      machine: 'Raspberry Pi 3',
      online: false
    },

    // Desktop
    {
      ip: 'http://86.43.98.198:5001',
      machine: 'Desktop quad core i7 workstation (port 5001)',
      online: false
    },
    {
      ip: 'http://86.43.98.198:5002',
      machine: 'Desktop quad core i7 workstation (port 5002)',
      online: false
    },
    {
      ip: 'http://86.43.98.198:5003',
      machine: 'Desktop quad core i7 workstation (port 5003)',
      online: false
    },
    {
      ip: 'http://86.43.98.198:5004',
      machine: 'Desktop quad core i7 workstation (port 5004)',
      online: false
    },

    // Laptop
    { ip: 'http://86.43.98.198:5005',
      machine: "Crappy dual core i5 Laptop (Port 5001)",
      online: false
    },
    { ip: 'http://86.43.98.198:5006',
      machine: "Crappy dual core i5 Laptop (Port 5002)",
      online: false
    },
    { ip: 'http://86.43.98.198:5007',
      machine: "Crappy dual core i5 Laptop (Port 5003)",
      online: false
    },
    { ip: 'http://86.43.98.198:5008',
      machine: "Crappy dual core i5 Laptop (Port 5004)",
      online: false
    },
  ]
};

export const allWorkers = workers[process.env.MASTER];