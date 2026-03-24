import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || '';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ class_name: '', name: '', student_id: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.class_name || !form.name || !form.student_id) {
      setError('请填写所有字段。');
      return;
    }
    setLoading(true);
    setError('');
    try {
      // Step 1: Register student
      const regRes = await axios.post(`${API}/api/register`, form);
      const { student, group } = regRes.data;

      // Step 2: Create/get session
      const sessRes = await axios.get(`${API}/api/session/${student.id}`);
      const { session } = sessRes.data;

      // Store in sessionStorage
      sessionStorage.setItem('student_id', student.id);
      sessionStorage.setItem('session_id', session.id);
      sessionStorage.setItem('group', JSON.stringify(group));
      sessionStorage.setItem('student_name', form.name);

      navigate('/instruction');
    } catch (err) {
      setError(err.response?.data?.error || '注册失败，请重试。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h1>欢迎来到香港中文大学语言处理实验室AI交互学习平台！</h1>
      <p style={{ textAlign: 'center', color: '#718096', marginBottom: 24 }}>
        请输入以下个人信息，您的个人信息将被严格保密。
      </p>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>班级 (Class)</label>
          <input
            type="text"
            name="class_name"
            value={form.class_name}
            onChange={handleChange}
            placeholder="请输入班级"
          />
        </div>
        <div className="form-group">
          <label>姓名 (Name)</label>
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="请输入姓名"
          />
        </div>
        <div className="form-group">
          <label>学号 (Student ID)</label>
          <input
            type="text"
            name="student_id"
            value={form.student_id}
            onChange={handleChange}
            placeholder="请输入学号"
          />
        </div>
        {error && <p style={{ color: '#e53e3e', marginBottom: 12 }}>{error}</p>}
        <div className="btn-center">
          <button type="submit" className="btn" disabled={loading}>
            {loading ? '提交中...' : '注册 (Register)'}
          </button>
        </div>
      </form>
    </div>
  );
}
