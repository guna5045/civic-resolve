import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import { FileUp, MapPin, Sparkles } from 'lucide-react';
import api from '../services/api';
import Button from '../components/common/Button';
import Input from '../components/common/Input';

// Helper component to center map on state change
const MapRecenter = ({ position }) => {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.setView(position, map.getZoom());
    }
  }, [position, map]);
  return null;
};

// Helper component to handle click event on Leaflet map
const LocationMarker = ({ position, setPosition }) => {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });

  return position === null ? null : (
    <Marker position={position} />
  );
};

const ReportIssue = () => {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState([]);
  
  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Roads');
  const [priority, setPriority] = useState('Medium');
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);

  // Geolocation states
  const [position, setPosition] = useState([40.7128, -74.006]); // Default center (NYC coords)
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Load departments
    const fetchDepartments = async () => {
      try {
        const res = await api.get('/departments');
        if (res.data.success) {
          setDepartments(res.data.data);
          if (res.data.data.length > 0) {
            setSelectedDeptId(res.data.data[0]._id); // default first
          }
        }
      } catch (err) {
        console.error('Error fetching departments:', err);
      }
    };
    fetchDepartments();

    // Auto get current citizen coordinates if allowed
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setPosition([pos.coords.latitude, pos.coords.longitude]);
        },
        (err) => {
          console.warn('Geolocation access denied. Using default coordinates.');
        }
      );
    }
  }, []);

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    setImages(files);

    const previews = files.map((file) => URL.createObjectURL(file));
    setImagePreviews(previews);
  };

  // Auto select department based on category slug mapping
  useEffect(() => {
    if (departments.length > 0) {
      // Find department matching category
      const matched = departments.find(d => d.name.toLowerCase().includes(category.toLowerCase()));
      if (matched) {
        setSelectedDeptId(matched._id);
      }
    }
  }, [category, departments]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!title || !description || !selectedDeptId) {
      setError('Please fill in all required fields.');
      setLoading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('category', category);
      formData.append('priority', priority);
      formData.append('latitude', position[0]);
      formData.append('longitude', position[1]);
      formData.append('departmentId', selectedDeptId);

      images.forEach((img) => {
        formData.append('images', img);
      });

      const res = await api.post('/complaints', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (res.data.success) {
        navigate('/citizen/my-complaints');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-100">Report a Public Issue</h2>
        <p className="text-xs text-slate-400">Provide details and tag the location on the map to alert the municipal department.</p>
      </div>

      {error && (
        <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-4 text-sm text-rose-400 font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Form Inputs Panel */}
        <div className="lg:col-span-7 glass-panel rounded-2xl border border-slate-800 p-6 space-y-5">
          <Input
            label="Issue Title"
            placeholder="e.g. Broken streetlight, large pothole..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <div className="flex flex-col gap-1.5 w-full">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Description <span className="text-rose-400">*</span>
            </label>
            <textarea
              placeholder="Provide exact details of the public issue. Include landmarks if any..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={4}
              className="w-full rounded-lg border border-slate-800 bg-slate-950/60 px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 outline-none transition-colors focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-slate-950/60 px-4 py-2.5 text-sm text-slate-200 outline-none transition-colors focus:border-brand-500 focus:ring-1"
              >
                {['Roads', 'Water Supply', 'Electricity', 'Sanitation', 'Public Safety', 'Other'].map((cat) => (
                  <option key={cat} value={cat} className="bg-slate-900 text-slate-200">{cat}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Priority Level</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-slate-950/60 px-4 py-2.5 text-sm text-slate-200 outline-none transition-colors focus:border-brand-500 focus:ring-1"
              >
                {['Low', 'Medium', 'High', 'Critical'].map((pri) => (
                  <option key={pri} value={pri} className="bg-slate-900 text-slate-200">{pri}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Image Upload */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">Upload Images</label>
            <div className="border-2 border-dashed border-slate-800 rounded-xl p-6 text-center hover:border-brand-500/50 transition-colors relative cursor-pointer">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <FileUp className="h-8 w-8 text-slate-500 mx-auto mb-2" />
              <p className="text-xs text-slate-400">Click or drag images to upload (Max 5 files)</p>
            </div>

            {imagePreviews.length > 0 && (
              <div className="grid grid-cols-5 gap-2.5 pt-2">
                {imagePreviews.map((src, i) => (
                  <div key={i} className="aspect-square rounded-lg border border-slate-800 overflow-hidden bg-slate-950 relative">
                    <img src={src} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Geolocation Map Panel */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          <div className="glass-panel rounded-2xl border border-slate-800 p-6 flex-1 flex flex-col justify-between min-h-[350px]">
            <div className="space-y-1 mb-4">
              <h4 className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-brand-400" /> Mark Issue Location
              </h4>
              <p className="text-[11px] text-slate-500">Click on the map to place a pin directly at the hazard site.</p>
            </div>

            {/* Map Element */}
            <div className="h-64 md:h-72 w-full rounded-xl overflow-hidden border border-slate-800 relative z-10">
              <MapContainer
                center={position}
                zoom={14}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                <MapRecenter position={position} />
                <LocationMarker position={position} setPosition={setPosition} />
              </MapContainer>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4 text-xs font-semibold border-t border-slate-800/40 pt-4">
              <div>
                <span className="text-slate-500 block uppercase text-[10px]">Latitude</span>
                <span className="text-slate-300 font-mono">{position[0].toFixed(5)}</span>
              </div>
              <div>
                <span className="text-slate-500 block uppercase text-[10px]">Longitude</span>
                <span className="text-slate-300 font-mono">{position[1].toFixed(5)}</span>
              </div>
            </div>
          </div>

          <Button type="submit" loading={loading} className="w-full">
            Submit Civic Complaint
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ReportIssue;
