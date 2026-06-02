import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import { FileUp, MapPin, Sparkles, Info, Compass, AlertCircle } from 'lucide-react';
import api from '../services/api';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import { PREDEFINED_ISSUES } from '../constants/issueLibrary';
import { LanguageContext } from '../context/LanguageContext';

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
  const { t } = useContext(LanguageContext);
  const [departments, setDepartments] = useState([]);
  
  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Roads');
  const [priority, setPriority] = useState('Medium');
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);

  // Autocomplete states
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [autocompleteMetadata, setAutocompleteMetadata] = useState({
    isPreset: false,
    presetTitle: '',
    category: '',
    keyword: ''
  });

  // Geolocation states
  const [position, setPosition] = useState([40.7128, -74.006]); // Default center (NYC coords)
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Auto detect location states
  const [detecting, setDetecting] = useState(false);
  const [locationStatus, setLocationStatus] = useState('');

  // Duplicate states
  const [duplicateCheckData, setDuplicateCheckData] = useState(null);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);

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

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('Geolocation is not supported by your browser.');
      return;
    }
    setDetecting(true);
    setLocationStatus('Detecting location...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setPosition([lat, lng]);
        setLocationStatus('Location detected successfully.');
        setDetecting(false);
        setTimeout(() => setLocationStatus(''), 3000);
      },
      (err) => {
        console.error(err);
        setLocationStatus('Unable to retrieve location.');
        setDetecting(false);
        setTimeout(() => setLocationStatus(''), 3000);
      }
    );
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    setImages(files);

    const previews = files.map((file) => URL.createObjectURL(file));
    setImagePreviews(previews);
  };

  const handleTitleChange = (e) => {
    const val = e.target.value;
    setTitle(val);

    if (val.trim()) {
      const query = val.toLowerCase().trim();
      const filtered = PREDEFINED_ISSUES.filter((issue) => {
        const titleLower = issue.title.toLowerCase();
        const categoryLower = issue.category.toLowerCase();
        const translatedCategory = (t(`categories.${issue.category}`) || '').toLowerCase();

        const matchesTitle = titleLower.includes(query);
        const matchesCategory = categoryLower.includes(query);
        const matchesTranslatedCategory = translatedCategory.includes(query);
        const matchesWordStart = titleLower.split(/\s+/).some(word => word.startsWith(query));

        return matchesTitle || matchesCategory || matchesTranslatedCategory || matchesWordStart;
      });
      setFilteredSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setFilteredSuggestions([]);
      setShowSuggestions(false);
    }
    setActiveIndex(-1);
    
    setAutocompleteMetadata({
      isPreset: false,
      presetTitle: '',
      category: '',
      keyword: val.trim()
    });
  };

  const handleSelectSuggestion = (suggestion) => {
    setTitle(suggestion.title);
    setCategory(suggestion.category);
    setAutocompleteMetadata({
      isPreset: true,
      presetTitle: suggestion.title,
      category: suggestion.category,
      keyword: suggestion.title.toLowerCase()
    });
    setShowSuggestions(false);
    setFilteredSuggestions([]);
    setActiveIndex(-1);
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions || filteredSuggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % filteredSuggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + filteredSuggestions.length) % filteredSuggestions.length);
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0 && activeIndex < filteredSuggestions.length) {
        e.preventDefault();
        handleSelectSuggestion(filteredSuggestions[activeIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setShowSuggestions(false);
    }
  };

  const handleBlur = () => {
    setTimeout(() => {
      setShowSuggestions(false);
    }, 200);
  };

  // Auto select department based on category slug mapping
  useEffect(() => {
    if (departments.length > 0) {
      // Find department matching category
      const matched = departments.find(d => d.name.toLowerCase().includes(category.toLowerCase()));
      if (matched) {
        setSelectedDeptId(matched._id);
      } else {
        // Fallback to the first department if no match is found, to prevent empty selectedDeptId
        setSelectedDeptId(departments[0]._id);
      }
    }
  }, [category, departments]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!title.trim() || !description.trim()) {
      setError('Please fill in all required fields.');
      return;
    }

    setLoading(true);

    try {
      const dupRes = await api.post('/complaints/check-duplicates', {
        title,
        latitude: position[0],
        longitude: position[1],
        category
      });

      if (dupRes.data.success && dupRes.data.hasDuplicates) {
        setDuplicateCheckData(dupRes.data.duplicates);
        setShowDuplicateModal(true);
        setLoading(false);
        return;
      }
    } catch (err) {
      console.warn('Duplicate check failed, proceeding to submit anyway:', err);
    }

    await submitComplaintForm();
  };

  const submitComplaintForm = async () => {
    setLoading(true);
    setError('');

    // Resolve department ID: fallback to first department if selectedDeptId is somehow empty
    let deptIdToSubmit = selectedDeptId;
    if (!deptIdToSubmit && departments.length > 0) {
      const matched = departments.find(d => d.name.toLowerCase().includes(category.toLowerCase()));
      deptIdToSubmit = matched ? matched._id : departments[0]._id;
    }

    if (!deptIdToSubmit) {
      setError('No departments available. Please contact administrator.');
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
      formData.append('departmentId', deptIdToSubmit);
      formData.append('isPreset', autocompleteMetadata.isPreset);
      formData.append('presetTitle', autocompleteMetadata.presetTitle || '');
      formData.append('keyword', autocompleteMetadata.keyword || '');

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

  const handleSupportDuplicate = async (duplicateComplaintId) => {
    try {
      const res = await api.post(`/complaints/${duplicateComplaintId}/support`);
      if (res.data.success) {
        navigate('/citizen/my-complaints');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to support issue');
      setShowDuplicateModal(false);
    }
  };

  return (
    <div className="space-y-10 max-w-5xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-100">{t('report.title')}</h2>
        <p className="text-xs text-slate-400">{t('report.subtitle')}</p>
      </div>

      {/* Professional Guidance Banner */}
      <div className="glass-panel rounded-2xl border border-brand-500/20 bg-brand-500/5 p-6 md:p-7 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:border-brand-500/40 transition-all duration-300 shadow-md">
        <div className="flex gap-4 items-start">
          <div className="p-3 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400 shrink-0">
            <Info className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-slate-100">{t('report.bannerTitle')}</h4>
            <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">{t('report.bannerDesc')}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate('/citizen/nearby')}
          className="inline-flex items-center justify-center font-bold rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-slate-950 px-4 py-2.5 text-xs bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700/60 active:scale-95 cursor-pointer shrink-0"
        >
          {t('report.bannerCta')}
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-4 text-sm text-rose-400 font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Form Inputs Panel */}
        <div className="lg:col-span-7 glass-panel rounded-2xl border border-slate-800 p-8 space-y-7 shadow-lg">
          <div className="relative">
            <Input
              label={t('report.issueTitle')}
              placeholder={t('report.titlePlaceholder')}
              value={title}
              onChange={handleTitleChange}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                if (title.trim()) {
                  const query = title.toLowerCase().trim();
                  const filtered = PREDEFINED_ISSUES.filter((issue) => {
                    const titleLower = issue.title.toLowerCase();
                    const categoryLower = issue.category.toLowerCase();
                    const translatedCategory = (t(`categories.${issue.category}`) || '').toLowerCase();

                    const matchesTitle = titleLower.includes(query);
                    const matchesCategory = categoryLower.includes(query);
                    const matchesTranslatedCategory = translatedCategory.includes(query);
                    const matchesWordStart = titleLower.split(/\s+/).some(word => word.startsWith(query));

                    return matchesTitle || matchesCategory || matchesTranslatedCategory || matchesWordStart;
                  });
                  setFilteredSuggestions(filtered);
                  setShowSuggestions(true);
                }
              }}
              onBlur={handleBlur}
              required
              autoComplete="off"
            />
            {showSuggestions && filteredSuggestions.length > 0 && (
              <ul 
                onMouseDown={(e) => e.preventDefault()}
                className="absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-y-auto rounded-lg border border-slate-800 bg-slate-950 shadow-xl py-1"
              >
                {filteredSuggestions.map((suggestion, index) => (
                  <li
                    key={index}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSelectSuggestion(suggestion)}
                    className={`px-4 py-2.5 text-xs cursor-pointer flex justify-between items-center transition-colors duration-200 ${
                      index === activeIndex
                        ? 'bg-brand-500/20 text-brand-400 font-semibold'
                        : 'text-slate-350 hover:bg-slate-900/60 hover:text-slate-200'
                    }`}
                  >
                    <span>{suggestion.title}</span>
                    <span className="text-[9px] uppercase font-bold text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                      {suggestion.category}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex flex-col gap-1.5 w-full">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              {t('report.description')} <span className="text-rose-400">*</span>
            </label>
            <textarea
              placeholder={t('report.descriptionPlaceholder')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={4}
              className="w-full rounded-lg border border-slate-800 bg-slate-950/60 px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 outline-none transition-colors focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">{t('report.category')}</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-slate-950/60 px-4 py-2.5 text-sm text-slate-200 outline-none transition-colors focus:border-brand-500 focus:ring-1"
              >
                {['Roads', 'Water Supply', 'Electricity', 'Sanitation', 'Public Safety', 'Other'].map((cat) => (
                  <option key={cat} value={cat} className="bg-slate-900 text-slate-200">{t(`categories.${cat}`) || cat}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">{t('report.priority')}</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-slate-950/60 px-4 py-2.5 text-sm text-slate-200 outline-none transition-colors focus:border-brand-500 focus:ring-1"
              >
                {['Low', 'Medium', 'High', 'Critical'].map((pri) => (
                  <option key={pri} value={pri} className="bg-slate-900 text-slate-200">{t(`priorities.${pri}`) || pri}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Image Upload */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">{t('report.uploadImages')}</label>
            <div className="border-2 border-dashed border-slate-800 rounded-xl p-6 text-center hover:border-brand-500/50 transition-colors relative cursor-pointer">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <FileUp className="h-8 w-8 text-slate-500 mx-auto mb-2" />
              <p className="text-xs text-slate-400">{t('report.uploadDesc')}</p>
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
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="glass-panel rounded-2xl border border-slate-800 p-8 flex-1 flex flex-col justify-between min-h-[350px] shadow-lg">
            <div className="space-y-1 mb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-2.5">
              <div>
                <h4 className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-brand-400" /> {t('report.markLocation')}
                </h4>
                <p className="text-[11px] text-slate-500">{t('report.locationDesc')}</p>
              </div>
              <button
                type="button"
                onClick={detectLocation}
                disabled={detecting}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/60 text-[10px] font-bold text-slate-200 hover:border-brand-500 hover:text-brand-400 transition-all disabled:opacity-50"
              >
                <Compass className={`h-3 w-3 ${detecting ? 'animate-spin' : ''}`} />
                {detecting ? t('location.detecting') || 'Detecting...' : t('location.detectBtn') || 'Auto Detect'}
              </button>
            </div>
            {locationStatus && (
              <span className={`text-[10px] block mb-2 text-center ${locationStatus.includes('successfully') ? 'text-emerald-455 font-semibold' : 'text-slate-550'}`}>{locationStatus}</span>
            )}

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
                <span className="text-slate-500 block uppercase text-[10px]">{t('report.latitude')}</span>
                <span className="text-slate-300 font-mono">{position[0].toFixed(5)}</span>
              </div>
              <div>
                <span className="text-slate-500 block uppercase text-[10px]">{t('report.longitude')}</span>
                <span className="text-slate-300 font-mono">{position[1].toFixed(5)}</span>
              </div>
            </div>
          </div>

          <Button type="submit" loading={loading} className="w-full">
            {t('report.submit')}
          </Button>
        </div>
      </form>

      {/* Duplicate detection modal dialog */}
      {showDuplicateModal && duplicateCheckData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-6 overflow-hidden animate-scale-in">
            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <AlertCircle className="h-5.5 w-5.5 text-amber-500 animate-pulse" />
                Similar Issues Detected Nearby
              </h3>
              <p className="text-xs text-slate-400">
                To prevent duplicate complaints, please review these active issues reported in your category within 100 meters.
              </p>
            </div>

            {/* List of similar issues */}
            <div className="max-h-60 overflow-y-auto space-y-3 pr-1">
              {duplicateCheckData.map((dup) => (
                <div key={dup._id} className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 space-y-3">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <h4 className="text-xs font-bold text-slate-200 line-clamp-1">{dup.title}</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5 font-medium">
                        Distance: <span className="text-brand-400 font-semibold">{dup.distance}m away</span>
                      </p>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <span className="px-1.5 py-0.5 rounded text-[8px] uppercase font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        {dup.status}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[8px] uppercase font-bold bg-slate-800 text-slate-405 border border-slate-700/60">
                        {dup.priority}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-slate-500 border-t border-slate-900/60 pt-2.5 font-medium">
                    <span>Supporters: {dup.supportCount || 0}</span>
                    <button
                      type="button"
                      onClick={() => handleSupportDuplicate(dup._id)}
                      className="px-3 py-1 rounded-lg bg-brand-500 hover:bg-brand-400 text-slate-950 font-bold transition-all text-[9px] cursor-pointer"
                    >
                      Support Instead (+5 XP)
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-4 border-t border-slate-800/80">
              <button
                type="button"
                onClick={() => {
                  setShowDuplicateModal(false);
                }}
                className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-slate-400 hover:text-slate-200 transition-colors cursor-pointer text-center"
              >
                Go Back & Edit
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDuplicateModal(false);
                  submitComplaintForm();
                }}
                className="w-full sm:w-auto px-4 py-2 text-xs font-bold bg-slate-800 hover:bg-slate-750 text-slate-250 border border-slate-700/60 rounded-lg transition-all cursor-pointer text-center"
              >
                Submit New Complaint Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportIssue;
