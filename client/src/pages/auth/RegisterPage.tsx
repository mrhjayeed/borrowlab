import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { University, Department } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Cpu, Mail, Lock, User, Building, Phone } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { success, error } = useToast();

  const [universities, setUniversities] = useState<University[]>([]);
  const [universityId, setUniversityId] = useState<number | ''>('');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [departmentId, setDepartmentId] = useState<number | ''>('');

  const [studentId, setStudentId] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    api.getUniversities().then((res) => {
      setUniversities(res.universities);
      if (res.universities.length > 0) {
        setUniversityId(res.universities[0].university_id);
        setDepartments(res.universities[0].departments || []);
      }
    }).catch(() => {});
  }, []);

  const handleUniversityChange = (id: number) => {
    setUniversityId(id);
    const found = universities.find((u) => u.university_id === id);
    setDepartments(found?.departments || []);
    setDepartmentId('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!universityId) {
      error('Please select your university');
      return;
    }

    const selectedUni = universities.find((u) => u.university_id === Number(universityId));
    if (selectedUni?.email_domain) {
      const dom = selectedUni.email_domain.toLowerCase();
      const em = email.toLowerCase().trim();
      if (!em.endsWith(`@${dom}`) && !em.endsWith(`.${dom}`)) {
        error(`Email must match institutional domain: @${selectedUni.email_domain}`);
        return;
      }
    }

    setIsLoading(true);
    try {
      await register({
        university_id: Number(universityId),
        department_id: departmentId ? Number(departmentId) : undefined,
        student_id: studentId.trim(),
        full_name: fullName.trim(),
        university_email: email.trim(),
        password,
        phone: phone.trim() || undefined,
      });

      success('Registration successful', 'Welcome to BorrowLab! Virtual wallet credited with 5,000 BDT starting balance.');
      navigate('/dashboard');
    } catch (err: any) {
      error(err.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-lg space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-[#4F46E5] text-white flex items-center justify-center mx-auto shadow-level-2">
            <Cpu className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Create an Academic Account
          </h2>
          <p className="text-xs text-slate-500">
            Join your university engineering hardware exchange network
          </p>
        </div>

        <Card className="p-6 space-y-4 shadow-level-2">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                  University *
                </label>
                <select
                  value={universityId}
                  onChange={(e) => handleUniversityChange(Number(e.target.value))}
                  className="w-full h-[36px] bg-white border border-slate-300 rounded-[6px] px-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#4F46E5]"
                  required
                >
                  {universities.map((u) => (
                    <option key={u.university_id} value={u.university_id}>
                      {u.short_name} ({u.email_domain})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Department
                </label>
                <select
                  value={departmentId}
                  onChange={(e) => setDepartmentId(Number(e.target.value) || '')}
                  className="w-full h-[36px] bg-white border border-slate-300 rounded-[6px] px-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#4F46E5]"
                >
                  <option value="">-- Choose Department --</option>
                  {departments.map((d) => (
                    <option key={d.department_id} value={d.department_id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Student ID Number *"
                placeholder="e.g. 1905001"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                required
              />

              <Input
                label="Full Name *"
                placeholder="e.g. Tanzim Haque"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                leftIcon={<User className="w-4 h-4" />}
                required
              />
            </div>

            <Input
              label="University Institutional Email *"
              type="email"
              placeholder={`e.g. 011191001@${universities.find((u) => u.university_id === Number(universityId))?.email_domain || 'uiu.ac.bd'}`}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail className="w-4 h-4" />}
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Password *"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                leftIcon={<Lock className="w-4 h-4" />}
                required
              />

              <Input
                label="Phone Number"
                placeholder="+88017..."
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                leftIcon={<Phone className="w-4 h-4" />}
              />
            </div>

            <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded text-xs text-slate-600">
              New registrations are verified against the institutional domain and automatically provisioned with a simulated wallet credit.
            </div>

            <Button type="submit" variant="primary" size="lg" className="w-full" isLoading={isLoading}>
              Complete Registration
            </Button>
          </form>
        </Card>

        <p className="text-center text-xs text-slate-500">
          Already registered?{' '}
          <Link to="/login" className="font-semibold text-[#4F46E5] hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};
