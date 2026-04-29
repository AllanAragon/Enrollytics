import { Department, Program, Student } from '@/types/database'

export const mockDepartments: Department[] = [
  {
    id: '1',
    name: 'College of Computer Studies',
    code: 'CCS',
    description: 'Department offering computer science and IT programs',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'College of Arts and Sciences',
    code: 'CAS',
    description: 'Department offering arts, humanities, and sciences programs',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '3',
    name: 'College of Business',
    code: 'CB',
    description: 'Department offering business and management programs',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

export const mockPrograms: Program[] = [
  {
    id: '1',
    name: 'Bachelor of Science in Computer Science',
    code: 'BSCS',
    description: 'A program focused on computer science fundamentals',
    department_id: '1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'Bachelor of Science in Information Technology',
    code: 'BSIT',
    description: 'A program focused on information technology',
    department_id: '1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '3',
    name: 'Bachelor of Arts in Psychology',
    code: 'BAP',
    description: 'A program focused on human behavior and psychology',
    department_id: '2',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '4',
    name: 'Bachelor of Science in Business Administration',
    code: 'BSBA',
    description: 'A program focused on business administration',
    department_id: '3',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

export const mockStudents: Student[] = [
  {
    id: '1',
    first_name: 'Juan',
    last_name: 'dela Cruz',
    age: 18,
    address: '123 Rizal St, Manila, Philippines',
    enrolled_year: 2024,
    program_id: '1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '2',
    first_name: 'Maria',
    last_name: 'Santos',
    age: 19,
    address: '456 Mabini Ave, Quezon City, Philippines',
    enrolled_year: 2024,
    program_id: '2',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '3',
    first_name: 'Carlos',
    last_name: 'Reyes',
    age: 18,
    address: '789 Luna St, Makati, Philippines',
    enrolled_year: 2023,
    program_id: '1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]
