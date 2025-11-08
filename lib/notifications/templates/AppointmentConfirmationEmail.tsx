// lib/notifications/templates/AppointmentConfirmationEmail.tsx
import * as React from 'react';

interface AppointmentConfirmationEmailProps {
  patientName: string;
  appointmentDate: string; // e.g., "Tuesday, 15 November 2025"
  appointmentTime: string; // e.g., "10:30 AM"
  doctorName: string;
  clinicName: string;
  clinicAddress: string;
}

export const AppointmentConfirmationEmail: React.FC<Readonly<AppointmentConfirmationEmailProps>> = ({
  patientName,
  appointmentDate,
  appointmentTime,
  doctorName,
  clinicName,
  clinicAddress,
}) => (
  <div>
    <h1>Your Appointment is Confirmed!</h1>
    <p>Dear {patientName},</p>
    <p>This email confirms your upcoming appointment at Gabriel Family Clinic.</p>
    
    <h2>Appointment Details:</h2>
    <ul>
      <li><strong>Date:</strong> {appointmentDate}</li>
      <li><strong>Time:</strong> {appointmentTime}</li>
      <li><strong>Doctor:</strong> {doctorName}</li>
      <li><strong>Clinic:</strong> {clinicName}</li>
      <li><strong>Address:</strong> {clinicAddress}</li>
    </ul>

    <p>Please arrive 10 minutes early. If you need to reschedule, please contact us at least 24 hours in advance.</p>
    <p>We look forward to seeing you.</p>
    <br/>
    <p>Sincerely,</p>
    <p>The Gabriel Family Clinic Team</p>
  </div>
);
