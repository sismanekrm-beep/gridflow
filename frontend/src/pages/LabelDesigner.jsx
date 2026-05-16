import { useState, useRef, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import {
  MousePointer, Type, Image, Square, Circle, Triangle, Minus,
  Trash2, Copy, ArrowLeft, Save, ChevronUp, ChevronDown,
  Tag, Eye, EyeOff, RotateCcw, Plus, Pencil, Undo2, ZoomIn, ZoomOut, Layers,
  Sparkles, Shuffle, AlignCenter, X as XIcon
} from 'lucide-react';
import { useAppSettings } from '../contexts/SettingsContext';
import { getQualityColor } from '../components/LabelCard';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const SCALE = 8;         // px per mm (base canvas scale)
const SNAP_ANGLE = 12;   // degrees — within this of H/V → snap to axis

const DEMO = { code: 'DIN965-M4X35', name: 'Y.H.B METRİK VİDA', description: 'Y.H.B Metrik Vida', measurement: '4X35', standard_code: 'DIN965', quality: 'A2', default_qty: '100', barcode: '1234567890', custom_fields: {} };
const VARS = [
  { val: '{{code}}' }, { val: '{{measurement}}' },
  { val: '{{quality}}' }, { val: '{{description}}' },
  { val: '{{default_qty}}' }, { val: '{{barcode}}' },
  { val: '{{print_date}}' }, { val: '{{standard_code}}' },
];
const SVG_SHAPES = ['rect', 'circle', 'triangle', 'path', 'line'];

const FONT_OPTIONS = [
  { value: "'Inter','Arial',sans-serif",          label: 'Inter (Varsayılan)' },
  { value: "'Arial',sans-serif",                  label: 'Arial' },
  { value: "'Helvetica','Arial',sans-serif",       label: 'Helvetica' },
  { value: "'Verdana',sans-serif",                label: 'Verdana' },
  { value: "'IBM Plex Mono','Courier New',monospace", label: 'IBM Plex Mono' },
  { value: "'Courier New',monospace",             label: 'Courier New' },
  { value: "'Times New Roman',serif",             label: 'Times New Roman' },
  { value: "'Georgia',serif",                     label: 'Georgia' },
];

function resolve(value, p = DEMO) {
  if (!value) return '';
  const now = new Date();
  const dateStr = `${String(now.getDate()).padStart(2,'0')}.${String(now.getMonth()+1).padStart(2,'0')}.${now.getFullYear()}`;
  return String(value)
    .replace(/\{\{code\}\}/gi,          p.code || '')
    .replace(/\{\{name\}\}/gi,          p.name || '')
    .replace(/\{\{measurement\}\}/gi,   p.measurement || '')
    .replace(/\{\{standard_code\}\}/gi, p.standard_code || '')
    .replace(/\{\{quality\}\}/gi,       p.quality || '')
    .replace(/\{\{description\}\}/gi,   p.description || '')
    .replace(/\{\{default_qty\}\}/gi,   String(p.default_qty ?? ''))
    .replace(/\{\{barcode\}\}/gi,       p.barcode || '')
    .replace(/\{\{print_date\}\}/gi,    dateStr)
    .replace(/\{\{field:([^}]+)\}\}/gi, (_, id) => p.custom_fields?.[id] || '');
}

const TEMPLATES = [
  {
    id: 'teknik', name: 'Teknik', desc: 'Standart ızgara düzeni',
    generate(W, H, s) {
      return [
        { id:'t_brand', type:'image', imageType:'brand', x:0, y:0, width:+(W*.31).toFixed(1), height:+(H*.41).toFixed(1), bg:'#FAFAFA' },
        { id:'t_pimg',  type:'image', imageType:'product', x:+(W*.31).toFixed(1), y:0, width:+(W*.69).toFixed(1), height:+(H*.30).toFixed(1), bg:'transparent' },
        { id:'t_qual',  type:'text', value:'{{standard_code}}  {{quality}}', x:+(W*.31).toFixed(1), y:+(H*.30).toFixed(1), width:+(W*.69).toFixed(1), height:+(H*.11).toFixed(1), fontSize:6.5, fontWeight:'600', color:'#374151', bg:'#E5E7EB', align:'center', isQualityBar:true },
        { id:'t_ol',    type:'text', value:'ÖLÇÜ', x:0, y:+(H*.41).toFixed(1), width:+(W*.16).toFixed(1), height:+(H*.29).toFixed(1), fontSize:5.5, fontWeight:'700', color:'#4B5563', bg:'#F8FAFC', align:'center', vertical:true },
        { id:'t_ov',    type:'text', value:'{{measurement}}', x:+(W*.16).toFixed(1), y:+(H*.41).toFixed(1), width:+(W*.84).toFixed(1), height:+(H*.29).toFixed(1), fontSize:13, fontWeight:'800', color:'#0F172A', bg:'transparent', align:'center' },
        { id:'t_ul',    type:'text', value:'ÜRÜN', x:0, y:+(H*.70).toFixed(1), width:+(W*.16).toFixed(1), height:+(H*.30).toFixed(1), fontSize:5.5, fontWeight:'700', color:'#4B5563', bg:'#F8FAFC', align:'center', vertical:true },
        { id:'t_uv',    type:'text', value:'{{name}}', x:+(W*.16).toFixed(1), y:+(H*.70).toFixed(1), width:+(W*.84).toFixed(1), height:+(H*.30).toFixed(1), fontSize:7.5, fontWeight:'700', color:'#0F172A', bg:'transparent', align:'center' },
      ];
    }
  },
  {
    id: 'minimalist', name: 'Minimalist', desc: 'Sade ve temiz',
    generate(W, H, s) {
      return [
        { id:'t_brand', type:'image', imageType:'brand', x:1, y:1, width:+(W*.26).toFixed(1), height:+(H*.38).toFixed(1), bg:'#FAFAFA' },
        { id:'t_code',  type:'text', value:'{{code}}', x:+(W*.28).toFixed(1), y:1, width:+(W*.72-1).toFixed(1), height:+(H*.38).toFixed(1), fontSize:10, fontWeight:'800', color:'#0F172A', bg:'transparent', align:'center', fontFamily:s?.label_font_family||'' },
        { id:'t_qual',  type:'text', value:'{{standard_code}}  {{quality}}', x:0, y:+(H*.40).toFixed(1), width:W, height:+(H*.13).toFixed(1), fontSize:6, fontWeight:'600', color:'#1D4ED8', bg:'#EFF6FF', align:'center' },
        { id:'t_meas',  type:'text', value:'{{measurement}}', x:0, y:+(H*.54).toFixed(1), width:W, height:+(H*.28).toFixed(1), fontSize:15, fontWeight:'800', color:'#0F172A', bg:'transparent', align:'center', fontFamily:s?.label_font_family||'' },
        { id:'t_name',  type:'text', value:'{{name}}', x:0, y:+(H*.83).toFixed(1), width:W, height:+(H*.17).toFixed(1), fontSize:6.5, fontWeight:'500', color:'#64748B', bg:'transparent', align:'center', fontFamily:s?.label_font_family||'' },
      ];
    }
  },
  {
    id: 'bold', name: 'Bold', desc: 'Güçlü & belirgin',
    generate(W, H, s) {
      return [
        { id:'t_hdr',   type:'rect', x:0, y:0, width:W, height:+(H*.28).toFixed(1), fill:'#0B4F8A', stroke:'none', strokeWidth:0, radius:0 },
        { id:'t_code',  type:'text', value:'{{code}}', x:1, y:0, width:+(W-2).toFixed(1), height:+(H*.28).toFixed(1), fontSize:10, fontWeight:'800', color:'#FFFFFF', bg:'transparent', align:'center' },
        { id:'t_meas',  type:'text', value:'{{measurement}}', x:0, y:+(H*.29).toFixed(1), width:+(W*.58).toFixed(1), height:+(H*.42).toFixed(1), fontSize:16, fontWeight:'800', color:'#0F172A', bg:'transparent', align:'center' },
        { id:'t_qual',  type:'text', value:'{{quality}}', x:+(W*.58).toFixed(1), y:+(H*.29).toFixed(1), width:+(W*.42).toFixed(1), height:+(H*.42).toFixed(1), fontSize:14, fontWeight:'800', color:'#0B4F8A', bg:'#EFF6FF', align:'center' },
        { id:'t_name',  type:'text', value:'{{name}}', x:0, y:+(H*.71).toFixed(1), width:W, height:+(H*.29).toFixed(1), fontSize:7, fontWeight:'600', color:'#374151', bg:'#F8FAFC', align:'center' },
      ];
    }
  },
  {
    id: 'compact', name: 'Kompakt', desc: 'Küçük etiket için',
    generate(W, H, s) {
      return [
        { id:'t_code',  type:'text', value:'{{code}}', x:0, y:0, width:+(W*.72).toFixed(1), height:+(H*.32).toFixed(1), fontSize:9, fontWeight:'800', color:'#0F172A', bg:'transparent', align:'left' },
        { id:'t_qual',  type:'text', value:'{{quality}}', x:+(W*.72).toFixed(1), y:0, width:+(W*.28).toFixed(1), height:+(H*.32).toFixed(1), fontSize:9, fontWeight:'700', color:'#fff', bg:'#0B4F8A', align:'center' },
        { id:'t_div',   type:'line', x:0, y:+(H*.33).toFixed(1), width:W, height:0, fill:'#E2E8F0', strokeWidth:0.3 },
        { id:'t_meas',  type:'text', value:'{{measurement}}', x:0, y:+(H*.35).toFixed(1), width:+(W*.52).toFixed(1), height:+(H*.38).toFixed(1), fontSize:13, fontWeight:'800', color:'#0F172A', bg:'transparent', align:'center' },
        { id:'t_std',   type:'text', value:'{{standard_code}}', x:+(W*.52).toFixed(1), y:+(H*.35).toFixed(1), width:+(W*.48).toFixed(1), height:+(H*.38).toFixed(1), fontSize:7, fontWeight:'600', color:'#64748B', bg:'transparent', align:'center' },
        { id:'t_name',  type:'text', value:'{{name}}', x:0, y:+(H*.73).toFixed(1), width:W, height:+(H*.27).toFixed(1), fontSize:6.5, fontWeight:'500', color:'#374151', bg:'#F8FAFC', align:'left' },
      ];
    }
  },
  {
    id: 'renkli', name: 'Renkli', desc: 'Renkli şerit + logo',
    generate(W, H, s) {
      return [
        { id:'t_side',  type:'rect', x:0, y:0, width:+(W*.10).toFixed(1), height:H, fill:'#0B4F8A', stroke:'none', strokeWidth:0, radius:0 },
        { id:'t_brand', type:'image', imageType:'brand', x:+(W*.12).toFixed(1), y:0.5, width:+(W*.33).toFixed(1), height:+(H*.33).toFixed(1), bg:'#FAFAFA' },
        { id:'t_qbg',   type:'rect', x:+(W*.47).toFixed(1), y:1, width:+(W*.51).toFixed(1), height:+(H*.30).toFixed(1), fill:'#EFF6FF', stroke:'#BFDBFE', strokeWidth:0.3, radius:2 },
        { id:'t_qual',  type:'text', value:'{{quality}}', x:+(W*.47).toFixed(1), y:1, width:+(W*.51).toFixed(1), height:+(H*.30).toFixed(1), fontSize:12, fontWeight:'800', color:'#1D4ED8', bg:'transparent', align:'center' },
        { id:'t_meas',  type:'text', value:'{{measurement}}', x:+(W*.12).toFixed(1), y:+(H*.35).toFixed(1), width:+(W*.86).toFixed(1), height:+(H*.37).toFixed(1), fontSize:14, fontWeight:'800', color:'#0F172A', bg:'transparent', align:'center' },
        { id:'t_code',  type:'text', value:'{{code}}', x:+(W*.12).toFixed(1), y:+(H*.72).toFixed(1), width:+(W*.86).toFixed(1), height:+(H*.18).toFixed(1), fontSize:7, fontWeight:'600', color:'#64748B', bg:'transparent', align:'left' },
        { id:'t_name',  type:'text', value:'{{name}}', x:+(W*.12).toFixed(1), y:+(H*.90).toFixed(1), width:+(W*.86).toFixed(1), height:+(H*.10).toFixed(1), fontSize:5.5, fontWeight:'400', color:'#94A3B8', bg:'transparent', align:'left' },
      ];
    }
  },
  {
    id: 'klasik', name: 'Klasik', desc: 'Çerçeveli geleneksel',
    generate(W, H, s) {
      return [
        { id:'t_frame', type:'rect', x:0.5, y:0.5, width:+(W-1).toFixed(1), height:+(H-1).toFixed(1), fill:'none', stroke:'#374151', strokeWidth:0.5, radius:2 },
        { id:'t_brand', type:'image', imageType:'brand', x:1.5, y:1.5, width:+(W*.28).toFixed(1), height:+(H*.36).toFixed(1), bg:'#FAFAFA' },
        { id:'t_code',  type:'text', value:'{{code}}', x:+(W*.31).toFixed(1), y:1.5, width:+(W*.67).toFixed(1), height:+(H*.36).toFixed(1), fontSize:9, fontWeight:'800', color:'#0F172A', bg:'transparent', align:'center' },
        { id:'t_div1',  type:'line', x:1.5, y:+(H*.39).toFixed(1), width:+(W-3).toFixed(1), height:0, fill:'#374151', strokeWidth:0.3 },
        { id:'t_meas',  type:'text', value:'{{measurement}}', x:1.5, y:+(H*.41).toFixed(1), width:+(W*.54).toFixed(1), height:+(H*.36).toFixed(1), fontSize:14, fontWeight:'800', color:'#0F172A', bg:'transparent', align:'center' },
        { id:'t_qual',  type:'text', value:'{{quality}}', x:+(W*.57).toFixed(1), y:+(H*.41).toFixed(1), width:+(W*.41).toFixed(1), height:+(H*.36).toFixed(1), fontSize:11, fontWeight:'700', color:'#1D4ED8', bg:'transparent', align:'center' },
        { id:'t_div2',  type:'line', x:1.5, y:+(H*.79).toFixed(1), width:+(W-3).toFixed(1), height:0, fill:'#374151', strokeWidth:0.3 },
        { id:'t_name',  type:'text', value:'{{name}}', x:1.5, y:+(H*.81).toFixed(1), width:+(W-3).toFixed(1), height:+(H*.17).toFixed(1), fontSize:6, fontWeight:'500', color:'#374151', bg:'transparent', align:'center' },
      ];
    }
  },
  {
    id: 'logo_odak', name: 'Logo Odaklı', desc: 'Logo ön planda dikey bölüm',
    generate(W, H, s) {
      return [
        { id:'t_bglo',  type:'rect', x:0, y:0, width:+(W*.42).toFixed(1), height:H, fill:'#F8FAFC', stroke:'none', strokeWidth:0, radius:0 },
        { id:'t_brand', type:'image', imageType:'brand', x:0, y:0, width:+(W*.42).toFixed(1), height:H, bg:'#F8FAFC' },
        { id:'t_divv',  type:'line', x:+(W*.42).toFixed(1), y:0, width:0, height:H, fill:'#E2E8F0', strokeWidth:0.5 },
        { id:'t_code',  type:'text', value:'{{code}}', x:+(W*.44).toFixed(1), y:1, width:+(W*.54).toFixed(1), height:+(H*.26).toFixed(1), fontSize:7.5, fontWeight:'800', color:'#0F172A', bg:'transparent', align:'left' },
        { id:'t_meas',  type:'text', value:'{{measurement}}', x:+(W*.44).toFixed(1), y:+(H*.28).toFixed(1), width:+(W*.54).toFixed(1), height:+(H*.40).toFixed(1), fontSize:14, fontWeight:'800', color:'#0B4F8A', bg:'transparent', align:'center' },
        { id:'t_qual',  type:'text', value:'{{quality}}', x:+(W*.44).toFixed(1), y:+(H*.70).toFixed(1), width:+(W*.28).toFixed(1), height:+(H*.22).toFixed(1), fontSize:8, fontWeight:'700', color:'#fff', bg:'#374151', align:'center' },
        { id:'t_std',   type:'text', value:'{{standard_code}}', x:+(W*.73).toFixed(1), y:+(H*.70).toFixed(1), width:+(W*.25).toFixed(1), height:+(H*.22).toFixed(1), fontSize:6.5, fontWeight:'600', color:'#64748B', bg:'transparent', align:'center' },
        { id:'t_name',  type:'text', value:'{{name}}', x:+(W*.44).toFixed(1), y:+(H*.93).toFixed(1), width:+(W*.54).toFixed(1), height:+(H*.07).toFixed(1), fontSize:4.5, fontWeight:'400', color:'#94A3B8', bg:'transparent', align:'left' },
      ];
    }
  },
  {
    id: 'endustri', name: 'Endüstriyel', desc: 'Sanayi teknik stili',
    generate(W, H, s) {
      return [
        { id:'t_topbg', type:'rect', x:0, y:0, width:W, height:+(H*.30).toFixed(1), fill:'#1E293B', stroke:'none', strokeWidth:0, radius:0 },
        { id:'t_code',  type:'text', value:'{{code}}', x:1, y:0, width:+(W-2).toFixed(1), height:+(H*.30).toFixed(1), fontSize:9.5, fontWeight:'800', color:'#F8FAFC', bg:'transparent', align:'center', fontFamily:"'IBM Plex Mono','Courier New',monospace" },
        { id:'t_meas',  type:'text', value:'{{measurement}}', x:0, y:+(H*.32).toFixed(1), width:+(W*.63).toFixed(1), height:+(H*.42).toFixed(1), fontSize:16, fontWeight:'800', color:'#0F172A', bg:'transparent', align:'center', fontFamily:"'IBM Plex Mono','Courier New',monospace" },
        { id:'t_qual',  type:'text', value:'{{quality}}', x:+(W*.63).toFixed(1), y:+(H*.32).toFixed(1), width:+(W*.37).toFixed(1), height:+(H*.22).toFixed(1), fontSize:9, fontWeight:'800', color:'#0F172A', bg:'#FEF08A', align:'center' },
        { id:'t_std',   type:'text', value:'{{standard_code}}', x:+(W*.63).toFixed(1), y:+(H*.54).toFixed(1), width:+(W*.37).toFixed(1), height:+(H*.20).toFixed(1), fontSize:7, fontWeight:'600', color:'#64748B', bg:'transparent', align:'center', fontFamily:"'IBM Plex Mono','Courier New',monospace" },
        { id:'t_botbg', type:'rect', x:0, y:+(H*.76).toFixed(1), width:W, height:+(H*.24).toFixed(1), fill:'#F1F5F9', stroke:'none', strokeWidth:0, radius:0 },
        { id:'t_name',  type:'text', value:'{{name}}', x:1, y:+(H*.77).toFixed(1), width:+(W-2).toFixed(1), height:+(H*.23).toFixed(1), fontSize:6.5, fontWeight:'500', color:'#374151', bg:'transparent', align:'center' },
      ];
    }
  },
  {
    id: 'simetrik', name: 'Simetrik', desc: 'Ortalanmış hiyerarşi',
    generate(W, H, s) {
      return [
        { id:'t_tbar',  type:'rect', x:0, y:0, width:W, height:+(H*.08).toFixed(1), fill:'#0B4F8A', stroke:'none', strokeWidth:0, radius:0 },
        { id:'t_bbar',  type:'rect', x:0, y:+(H*.92).toFixed(1), width:W, height:+(H*.08).toFixed(1), fill:'#0B4F8A', stroke:'none', strokeWidth:0, radius:0 },
        { id:'t_brand', type:'image', imageType:'brand', x:+(W*.35).toFixed(1), y:+(H*.10).toFixed(1), width:+(W*.30).toFixed(1), height:+(H*.24).toFixed(1), bg:'#FAFAFA' },
        { id:'t_qual',  type:'text', value:'{{standard_code}} / {{quality}}', x:0, y:+(H*.36).toFixed(1), width:W, height:+(H*.13).toFixed(1), fontSize:6, fontWeight:'600', color:'#64748B', bg:'transparent', align:'center' },
        { id:'t_meas',  type:'text', value:'{{measurement}}', x:0, y:+(H*.50).toFixed(1), width:W, height:+(H*.30).toFixed(1), fontSize:15, fontWeight:'800', color:'#0F172A', bg:'transparent', align:'center' },
        { id:'t_name',  type:'text', value:'{{name}}', x:0, y:+(H*.81).toFixed(1), width:W, height:+(H*.10).toFixed(1), fontSize:6, fontWeight:'500', color:'#64748B', bg:'transparent', align:'center' },
      ];
    }
  },
  {
    id: 'alt_bant', name: 'Alt Bant', desc: 'Koyu alt şerit + büyük ölçü',
    generate(W, H, s) {
      return [
        { id:'t_brand', type:'image', imageType:'brand', x:1, y:1, width:+(W*.22).toFixed(1), height:+(H*.30).toFixed(1), bg:'#FAFAFA' },
        { id:'t_code',  type:'text', value:'{{code}}', x:+(W*.24).toFixed(1), y:1, width:+(W*.75).toFixed(1), height:+(H*.28).toFixed(1), fontSize:8, fontWeight:'700', color:'#374151', bg:'transparent', align:'right' },
        { id:'t_meas',  type:'text', value:'{{measurement}}', x:0, y:+(H*.30).toFixed(1), width:+(W*.70).toFixed(1), height:+(H*.38).toFixed(1), fontSize:16, fontWeight:'800', color:'#0F172A', bg:'transparent', align:'center' },
        { id:'t_qual',  type:'text', value:'{{quality}}', x:+(W*.70).toFixed(1), y:+(H*.30).toFixed(1), width:+(W*.30).toFixed(1), height:+(H*.38).toFixed(1), fontSize:12, fontWeight:'800', color:'#7C3AED', bg:'#EDE9FE', align:'center' },
        { id:'t_botbg', type:'rect', x:0, y:+(H*.70).toFixed(1), width:W, height:+(H*.30).toFixed(1), fill:'#0B4F8A', stroke:'none', strokeWidth:0, radius:0 },
        { id:'t_name',  type:'text', value:'{{name}}', x:1, y:+(H*.71).toFixed(1), width:+(W*.76).toFixed(1), height:+(H*.29).toFixed(1), fontSize:7, fontWeight:'600', color:'#FFFFFF', bg:'transparent', align:'left' },
        { id:'t_std',   type:'text', value:'{{standard_code}}', x:+(W*.77).toFixed(1), y:+(H*.71).toFixed(1), width:+(W*.22).toFixed(1), height:+(H*.29).toFixed(1), fontSize:6.5, fontWeight:'600', color:'rgba(255,255,255,0.65)', bg:'transparent', align:'center' },
      ];
    }
  },
  {
    id: 'kart', name: 'Kart', desc: 'Ürün kartı stili',
    generate(W, H, s) {
      return [
        { id:'t_pimg',  type:'image', imageType:'product', x:+(W*.55).toFixed(1), y:0, width:+(W*.45).toFixed(1), height:+(H*.55).toFixed(1), bg:'#F9FAFB' },
        { id:'t_brand', type:'image', imageType:'brand', x:+(W*.55).toFixed(1), y:+(H*.55).toFixed(1), width:+(W*.45).toFixed(1), height:+(H*.45).toFixed(1), bg:'#FAFAFA' },
        { id:'t_code',  type:'text', value:'{{code}}', x:0, y:0, width:+(W*.53).toFixed(1), height:+(H*.22).toFixed(1), fontSize:8, fontWeight:'800', color:'#0F172A', bg:'transparent', align:'left' },
        { id:'t_meas',  type:'text', value:'{{measurement}}', x:0, y:+(H*.23).toFixed(1), width:+(W*.53).toFixed(1), height:+(H*.32).toFixed(1), fontSize:14, fontWeight:'800', color:'#0B4F8A', bg:'transparent', align:'left' },
        { id:'t_qual',  type:'text', value:'{{quality}}', x:0, y:+(H*.57).toFixed(1), width:+(W*.28).toFixed(1), height:+(H*.20).toFixed(1), fontSize:9, fontWeight:'700', color:'#fff', bg:'#0B4F8A', align:'center' },
        { id:'t_std',   type:'text', value:'{{standard_code}}', x:+(W*.30).toFixed(1), y:+(H*.57).toFixed(1), width:+(W*.23).toFixed(1), height:+(H*.20).toFixed(1), fontSize:7, fontWeight:'600', color:'#374151', bg:'#E5E7EB', align:'center' },
        { id:'t_name',  type:'text', value:'{{name}}', x:0, y:+(H*.79).toFixed(1), width:+(W*.53).toFixed(1), height:+(H*.21).toFixed(1), fontSize:6, fontWeight:'500', color:'#64748B', bg:'transparent', align:'left' },
      ];
    }
  },
  {
    id: 'iki_sutun', name: 'İki Sütun', desc: 'Eşit ikili bölüm',
    generate(W, H, s) {
      return [
        { id:'t_lbg',   type:'rect', x:0, y:0, width:+(W*.50).toFixed(1), height:H, fill:'#0B4F8A', stroke:'none', strokeWidth:0, radius:0 },
        { id:'t_meas',  type:'text', value:'{{measurement}}', x:0, y:0, width:+(W*.50).toFixed(1), height:+(H*.65).toFixed(1), fontSize:18, fontWeight:'800', color:'#FFFFFF', bg:'transparent', align:'center' },
        { id:'t_qual',  type:'text', value:'{{quality}}', x:0, y:+(H*.65).toFixed(1), width:+(W*.50).toFixed(1), height:+(H*.20).toFixed(1), fontSize:9, fontWeight:'700', color:'rgba(255,255,255,0.85)', bg:'transparent', align:'center' },
        { id:'t_std',   type:'text', value:'{{standard_code}}', x:0, y:+(H*.85).toFixed(1), width:+(W*.50).toFixed(1), height:+(H*.15).toFixed(1), fontSize:6, fontWeight:'500', color:'rgba(255,255,255,0.65)', bg:'transparent', align:'center' },
        { id:'t_brand', type:'image', imageType:'brand', x:+(W*.52).toFixed(1), y:+(H*.04).toFixed(1), width:+(W*.46).toFixed(1), height:+(H*.28).toFixed(1), bg:'#FAFAFA' },
        { id:'t_code',  type:'text', value:'{{code}}', x:+(W*.52).toFixed(1), y:+(H*.34).toFixed(1), width:+(W*.46).toFixed(1), height:+(H*.22).toFixed(1), fontSize:7.5, fontWeight:'700', color:'#0F172A', bg:'transparent', align:'center' },
        { id:'t_pimg',  type:'image', imageType:'product', x:+(W*.52).toFixed(1), y:+(H*.57).toFixed(1), width:+(W*.46).toFixed(1), height:+(H*.35).toFixed(1), bg:'#F3F4F6' },
        { id:'t_name',  type:'text', value:'{{name}}', x:+(W*.52).toFixed(1), y:+(H*.93).toFixed(1), width:+(W*.46).toFixed(1), height:+(H*.07).toFixed(1), fontSize:4.5, fontWeight:'400', color:'#94A3B8', bg:'transparent', align:'center' },
      ];
    }
  },
  {
    id: 'barkod', name: 'Barkodlu', desc: 'Kod + barkod vurgulu',
    generate(W, H, s) {
      return [
        { id:'t_topbg', type:'rect', x:0, y:0, width:W, height:+(H*.25).toFixed(1), fill:'#F8FAFC', stroke:'none', strokeWidth:0, radius:0 },
        { id:'t_brand', type:'image', imageType:'brand', x:1, y:0.5, width:+(W*.30).toFixed(1), height:+(H*.24).toFixed(1), bg:'transparent' },
        { id:'t_code',  type:'text', value:'{{code}}', x:+(W*.32).toFixed(1), y:0.5, width:+(W*.67).toFixed(1), height:+(H*.24).toFixed(1), fontSize:8.5, fontWeight:'800', color:'#0F172A', bg:'transparent', align:'right' },
        { id:'t_div',   type:'line', x:0, y:+(H*.26).toFixed(1), width:W, height:0, fill:'#E2E8F0', strokeWidth:0.4 },
        { id:'t_meas',  type:'text', value:'{{measurement}}', x:0, y:+(H*.28).toFixed(1), width:+(W*.62).toFixed(1), height:+(H*.38).toFixed(1), fontSize:15, fontWeight:'800', color:'#0F172A', bg:'transparent', align:'center' },
        { id:'t_qual',  type:'text', value:'{{quality}}', x:+(W*.63).toFixed(1), y:+(H*.28).toFixed(1), width:+(W*.36).toFixed(1), height:+(H*.19).toFixed(1), fontSize:9, fontWeight:'800', color:'#DC2626', bg:'#FEF2F2', align:'center' },
        { id:'t_std',   type:'text', value:'{{standard_code}}', x:+(W*.63).toFixed(1), y:+(H*.48).toFixed(1), width:+(W*.36).toFixed(1), height:+(H*.18).toFixed(1), fontSize:7, fontWeight:'600', color:'#64748B', bg:'transparent', align:'center' },
        { id:'t_barbox',type:'rect', x:0, y:+(H*.68).toFixed(1), width:W, height:+(H*.32).toFixed(1), fill:'#fff', stroke:'none', strokeWidth:0, radius:0 },
        { id:'t_barval',type:'text', value:'{{barcode}}', x:0, y:+(H*.70).toFixed(1), width:W, height:+(H*.20).toFixed(1), fontSize:7, fontWeight:'400', color:'#0F172A', bg:'transparent', align:'center', fontFamily:"'IBM Plex Mono','Courier New',monospace" },
        { id:'t_name',  type:'text', value:'{{name}}', x:0, y:+(H*.91).toFixed(1), width:W, height:+(H*.09).toFixed(1), fontSize:5, fontWeight:'400', color:'#94A3B8', bg:'transparent', align:'center' },
      ];
    }
  },
  {
    id: 'pastel', name: 'Pastel', desc: 'Yumuşak tonlar, şık görünüm',
    generate(W, H, s) {
      return [
        { id:'t_topbg', type:'rect', x:0, y:0, width:W, height:+(H*.45).toFixed(1), fill:'#F0F9FF', stroke:'none', strokeWidth:0, radius:0 },
        { id:'t_botbg', type:'rect', x:0, y:+(H*.45).toFixed(1), width:W, height:+(H*.55).toFixed(1), fill:'#FAFAFA', stroke:'none', strokeWidth:0, radius:0 },
        { id:'t_brand', type:'image', imageType:'brand', x:1, y:1, width:+(W*.24).toFixed(1), height:+(H*.42).toFixed(1), bg:'transparent' },
        { id:'t_code',  type:'text', value:'{{code}}', x:+(W*.26).toFixed(1), y:1, width:+(W*.73).toFixed(1), height:+(H*.22).toFixed(1), fontSize:8, fontWeight:'700', color:'#0369A1', bg:'transparent', align:'right' },
        { id:'t_meas',  type:'text', value:'{{measurement}}', x:+(W*.26).toFixed(1), y:+(H*.22).toFixed(1), width:+(W*.73).toFixed(1), height:+(H*.23).toFixed(1), fontSize:13, fontWeight:'800', color:'#0C4A6E', bg:'transparent', align:'center' },
        { id:'t_qbg',   type:'rect', x:+(W*.26).toFixed(1), y:+(H*.44).toFixed(1), width:+(W*.73).toFixed(1), height:+(H*.01).toFixed(1), fill:'#BAE6FD', stroke:'none', strokeWidth:0, radius:0 },
        { id:'t_qual',  type:'text', value:'{{quality}}', x:0, y:+(H*.48).toFixed(1), width:+(W*.40).toFixed(1), height:+(H*.25).toFixed(1), fontSize:11, fontWeight:'800', color:'#0369A1', bg:'transparent', align:'center' },
        { id:'t_std',   type:'text', value:'{{standard_code}}', x:+(W*.41).toFixed(1), y:+(H*.48).toFixed(1), width:+(W*.58).toFixed(1), height:+(H*.25).toFixed(1), fontSize:8, fontWeight:'600', color:'#64748B', bg:'transparent', align:'center' },
        { id:'t_name',  type:'text', value:'{{name}}', x:0, y:+(H*.75).toFixed(1), width:W, height:+(H*.25).toFixed(1), fontSize:6.5, fontWeight:'500', color:'#475569', bg:'transparent', align:'center' },
      ];
    }
  },
  {
    id: 'depo', name: 'Depo', desc: 'Büyük kod, kolay okuma',
    generate(W, H, s) {
      return [
        { id:'t_topbg', type:'rect', x:0, y:0, width:W, height:+(H*.22).toFixed(1), fill:'#1E293B', stroke:'none', strokeWidth:0, radius:0 },
        { id:'t_brand', type:'image', imageType:'brand', x:1, y:0.5, width:+(W*.25).toFixed(1), height:+(H*.20).toFixed(1), bg:'transparent' },
        { id:'t_date',  type:'text', value:'{{print_date}}', x:+(W*.27).toFixed(1), y:0.5, width:+(W*.71).toFixed(1), height:+(H*.20).toFixed(1), fontSize:6, fontWeight:'500', color:'rgba(255,255,255,0.7)', bg:'transparent', align:'right', fontFamily:"'IBM Plex Mono','Courier New',monospace" },
        { id:'t_code',  type:'text', value:'{{code}}', x:0, y:+(H*.24).toFixed(1), width:W, height:+(H*.28).toFixed(1), fontSize:12, fontWeight:'800', color:'#0F172A', bg:'transparent', align:'center', fontFamily:"'IBM Plex Mono','Courier New',monospace" },
        { id:'t_meas',  type:'text', value:'{{measurement}}', x:0, y:+(H*.54).toFixed(1), width:+(W*.65).toFixed(1), height:+(H*.30).toFixed(1), fontSize:13, fontWeight:'800', color:'#0B4F8A', bg:'transparent', align:'center' },
        { id:'t_qty',   type:'text', value:'Adet: {{default_qty}}', x:+(W*.66).toFixed(1), y:+(H*.54).toFixed(1), width:+(W*.33).toFixed(1), height:+(H*.30).toFixed(1), fontSize:7, fontWeight:'700', color:'#374151', bg:'#F1F5F9', align:'center' },
        { id:'t_name',  type:'text', value:'{{name}}', x:0, y:+(H*.86).toFixed(1), width:W, height:+(H*.14).toFixed(1), fontSize:5.5, fontWeight:'400', color:'#64748B', bg:'transparent', align:'center' },
      ];
    }
  },
  {
    id: 'premium', name: 'Premium', desc: 'Koyu şık tasarım',
    generate(W, H, s) {
      return [
        { id:'t_bg',    type:'rect', x:0, y:0, width:W, height:H, fill:'#0F172A', stroke:'none', strokeWidth:0, radius:0 },
        { id:'t_accent',type:'rect', x:0, y:+(H*.72).toFixed(1), width:W, height:+(H*.28).toFixed(1), fill:'#1E293B', stroke:'none', strokeWidth:0, radius:0 },
        { id:'t_line',  type:'line', x:+(W*.08).toFixed(1), y:+(H*.72).toFixed(1), width:+(W*.84).toFixed(1), height:0, fill:'#0B4F8A', strokeWidth:0.6 },
        { id:'t_brand', type:'image', imageType:'brand', x:+(W*.35).toFixed(1), y:+(H*.04).toFixed(1), width:+(W*.30).toFixed(1), height:+(H*.22).toFixed(1), bg:'transparent' },
        { id:'t_qual',  type:'text', value:'{{quality}}  {{standard_code}}', x:0, y:+(H*.28).toFixed(1), width:W, height:+(H*.13).toFixed(1), fontSize:6, fontWeight:'600', color:'#64748B', bg:'transparent', align:'center' },
        { id:'t_meas',  type:'text', value:'{{measurement}}', x:0, y:+(H*.42).toFixed(1), width:W, height:+(H*.28).toFixed(1), fontSize:15, fontWeight:'800', color:'#F8FAFC', bg:'transparent', align:'center' },
        { id:'t_code',  type:'text', value:'{{code}}', x:1, y:+(H*.73).toFixed(1), width:+(W-2).toFixed(1), height:+(H*.16).toFixed(1), fontSize:7, fontWeight:'700', color:'#93C5FD', bg:'transparent', align:'center', fontFamily:"'IBM Plex Mono','Courier New',monospace" },
        { id:'t_name',  type:'text', value:'{{name}}', x:1, y:+(H*.90).toFixed(1), width:+(W-2).toFixed(1), height:+(H*.10).toFixed(1), fontSize:5, fontWeight:'400', color:'#64748B', bg:'transparent', align:'center' },
      ];
    }
  },
  {
    id: 'urun_odak', name: 'Ürün Görseli', desc: 'Resim ön planda',
    generate(W, H, s) {
      return [
        { id:'t_pimg',  type:'image', imageType:'product', x:0, y:0, width:+(W*.40).toFixed(1), height:H, bg:'#F3F4F6' },
        { id:'t_divv',  type:'line', x:+(W*.40).toFixed(1), y:0, width:0, height:H, fill:'#E2E8F0', strokeWidth:0.5 },
        { id:'t_brand', type:'image', imageType:'brand', x:+(W*.42).toFixed(1), y:0.5, width:+(W*.56).toFixed(1), height:+(H*.22).toFixed(1), bg:'transparent' },
        { id:'t_div1',  type:'line', x:+(W*.42).toFixed(1), y:+(H*.24).toFixed(1), width:+(W*.55).toFixed(1), height:0, fill:'#E2E8F0', strokeWidth:0.3 },
        { id:'t_meas',  type:'text', value:'{{measurement}}', x:+(W*.42).toFixed(1), y:+(H*.26).toFixed(1), width:+(W*.56).toFixed(1), height:+(H*.32).toFixed(1), fontSize:13, fontWeight:'800', color:'#0F172A', bg:'transparent', align:'center' },
        { id:'t_qual',  type:'text', value:'{{quality}}', x:+(W*.42).toFixed(1), y:+(H*.59).toFixed(1), width:+(W*.28).toFixed(1), height:+(H*.22).toFixed(1), fontSize:9, fontWeight:'700', color:'#fff', bg:'#0B4F8A', align:'center' },
        { id:'t_std',   type:'text', value:'{{standard_code}}', x:+(W*.71).toFixed(1), y:+(H*.59).toFixed(1), width:+(W*.27).toFixed(1), height:+(H*.22).toFixed(1), fontSize:7, fontWeight:'600', color:'#374151', bg:'#F1F5F9', align:'center' },
        { id:'t_name',  type:'text', value:'{{name}}', x:+(W*.42).toFixed(1), y:+(H*.83).toFixed(1), width:+(W*.56).toFixed(1), height:+(H*.17).toFixed(1), fontSize:5.5, fontWeight:'400', color:'#64748B', bg:'transparent', align:'center' },
      ];
    }
  },
  {
    id: 'stok', name: 'Stok Kartı', desc: 'Adet + stok vurgulu',
    generate(W, H, s) {
      return [
        { id:'t_tbar',  type:'rect', x:0, y:0, width:W, height:+(H*.08).toFixed(1), fill:'#15803D', stroke:'none', strokeWidth:0, radius:0 },
        { id:'t_code',  type:'text', value:'{{code}}', x:0, y:+(H*.10).toFixed(1), width:+(W*.70).toFixed(1), height:+(H*.22).toFixed(1), fontSize:9, fontWeight:'800', color:'#0F172A', bg:'transparent', align:'left', fontFamily:"'IBM Plex Mono','Courier New',monospace" },
        { id:'t_qty',   type:'text', value:'{{default_qty}}', x:+(W*.70).toFixed(1), y:+(H*.08).toFixed(1), width:+(W*.30).toFixed(1), height:+(H*.32).toFixed(1), fontSize:14, fontWeight:'800', color:'#15803D', bg:'#DCFCE7', align:'center' },
        { id:'t_div',   type:'line', x:0, y:+(H*.33).toFixed(1), width:W, height:0, fill:'#E2E8F0', strokeWidth:0.3 },
        { id:'t_meas',  type:'text', value:'{{measurement}}', x:0, y:+(H*.35).toFixed(1), width:+(W*.60).toFixed(1), height:+(H*.36).toFixed(1), fontSize:15, fontWeight:'800', color:'#0F172A', bg:'transparent', align:'center' },
        { id:'t_qual',  type:'text', value:'{{quality}}', x:+(W*.61).toFixed(1), y:+(H*.35).toFixed(1), width:+(W*.38).toFixed(1), height:+(H*.18).toFixed(1), fontSize:9, fontWeight:'700', color:'#0B4F8A', bg:'#EFF6FF', align:'center' },
        { id:'t_std',   type:'text', value:'{{standard_code}}', x:+(W*.61).toFixed(1), y:+(H*.54).toFixed(1), width:+(W*.38).toFixed(1), height:+(H*.17).toFixed(1), fontSize:7, fontWeight:'600', color:'#64748B', bg:'transparent', align:'center' },
        { id:'t_name',  type:'text', value:'{{name}}', x:0, y:+(H*.73).toFixed(1), width:W, height:+(H*.18).toFixed(1), fontSize:6.5, fontWeight:'500', color:'#374151', bg:'#F8FAFC', align:'center' },
        { id:'t_date',  type:'text', value:'{{print_date}}', x:0, y:+(H*.93).toFixed(1), width:W, height:+(H*.07).toFixed(1), fontSize:4.5, fontWeight:'400', color:'#94A3B8', bg:'transparent', align:'right', fontFamily:"'IBM Plex Mono','Courier New',monospace" },
      ];
    }
  },
  {
    id: 'kose_logo', name: 'Köşe Logo', desc: 'Köşede logo, geniş bilgi alanı',
    generate(W, H, s) {
      return [
        { id:'t_brand', type:'image', imageType:'brand', x:+(W*.65).toFixed(1), y:0.5, width:+(W*.33).toFixed(1), height:+(H*.30).toFixed(1), bg:'#FAFAFA' },
        { id:'t_code',  type:'text', value:'{{code}}', x:0.5, y:0.5, width:+(W*.63).toFixed(1), height:+(H*.22).toFixed(1), fontSize:9.5, fontWeight:'800', color:'#0F172A', bg:'transparent', align:'left', fontFamily:"'IBM Plex Mono','Courier New',monospace" },
        { id:'t_qual',  type:'text', value:'{{quality}}', x:0.5, y:+(H*.23).toFixed(1), width:+(W*.30).toFixed(1), height:+(H*.20).toFixed(1), fontSize:8, fontWeight:'700', color:'#fff', bg:'#0B4F8A', align:'center' },
        { id:'t_std',   type:'text', value:'{{standard_code}}', x:+(W*.32).toFixed(1), y:+(H*.23).toFixed(1), width:+(W*.31).toFixed(1), height:+(H*.20).toFixed(1), fontSize:7, fontWeight:'600', color:'#374151', bg:'#E5E7EB', align:'center' },
        { id:'t_div',   type:'line', x:0, y:+(H*.44).toFixed(1), width:W, height:0, fill:'#E2E8F0', strokeWidth:0.4 },
        { id:'t_meas',  type:'text', value:'{{measurement}}', x:0, y:+(H*.46).toFixed(1), width:+(W*.72).toFixed(1), height:+(H*.38).toFixed(1), fontSize:15, fontWeight:'800', color:'#0F172A', bg:'transparent', align:'center' },
        { id:'t_pimg',  type:'image', imageType:'product', x:+(W*.73).toFixed(1), y:+(H*.31).toFixed(1), width:+(W*.26).toFixed(1), height:+(H*.53).toFixed(1), bg:'#F3F4F6' },
        { id:'t_name',  type:'text', value:'{{name}}', x:0, y:+(H*.86).toFixed(1), width:+(W*.72).toFixed(1), height:+(H*.14).toFixed(1), fontSize:6, fontWeight:'500', color:'#64748B', bg:'transparent', align:'left' },
      ];
    }
  },
  {
    id: 'serit', name: 'Şerit', desc: 'Yatay renk şeridi ortada',
    generate(W, H, s) {
      return [
        { id:'t_stripe', type:'rect', x:0, y:+(H*.43).toFixed(1), width:W, height:+(H*.14).toFixed(1), fill:'#0B4F8A', stroke:'none', strokeWidth:0, radius:0 },
        { id:'t_brand', type:'image', imageType:'brand', x:1, y:1, width:+(W*.25).toFixed(1), height:+(H*.40).toFixed(1), bg:'transparent' },
        { id:'t_code',  type:'text', value:'{{code}}', x:+(W*.27).toFixed(1), y:1, width:+(W*.72).toFixed(1), height:+(H*.20).toFixed(1), fontSize:9, fontWeight:'800', color:'#0F172A', bg:'transparent', align:'right' },
        { id:'t_meas',  type:'text', value:'{{measurement}}', x:+(W*.27).toFixed(1), y:+(H*.20).toFixed(1), width:+(W*.72).toFixed(1), height:+(H*.22).toFixed(1), fontSize:12, fontWeight:'800', color:'#0B4F8A', bg:'transparent', align:'right' },
        { id:'t_qual',  type:'text', value:'{{quality}}  {{standard_code}}', x:1, y:+(H*.43).toFixed(1), width:+(W-2).toFixed(1), height:+(H*.14).toFixed(1), fontSize:7, fontWeight:'700', color:'#FFFFFF', bg:'transparent', align:'center' },
        { id:'t_name',  type:'text', value:'{{name}}', x:0, y:+(H*.59).toFixed(1), width:+(W*.72).toFixed(1), height:+(H*.22).toFixed(1), fontSize:7, fontWeight:'500', color:'#374151', bg:'transparent', align:'left' },
        { id:'t_pimg',  type:'image', imageType:'product', x:+(W*.73).toFixed(1), y:+(H*.57).toFixed(1), width:+(W*.26).toFixed(1), height:+(H*.40).toFixed(1), bg:'#F3F4F6' },
        { id:'t_date',  type:'text', value:'{{print_date}}', x:0, y:+(H*.84).toFixed(1), width:+(W*.72).toFixed(1), height:+(H*.14).toFixed(1), fontSize:5, fontWeight:'400', color:'#94A3B8', bg:'transparent', align:'left', fontFamily:"'IBM Plex Mono','Courier New',monospace" },
      ];
    }
  },
  {
    id: 'ultra_minimal', name: 'Ultra Minimal', desc: 'Sadece kritik bilgi',
    generate(W, H, s) {
      return [
        { id:'t_code',  type:'text', value:'{{code}}', x:0, y:0, width:W, height:+(H*.30).toFixed(1), fontSize:11, fontWeight:'800', color:'#0F172A', bg:'#F8FAFC', align:'center', fontFamily:"'IBM Plex Mono','Courier New',monospace" },
        { id:'t_div1',  type:'line', x:0, y:+(H*.30).toFixed(1), width:W, height:0, fill:'#0B4F8A', strokeWidth:0.6 },
        { id:'t_meas',  type:'text', value:'{{measurement}}', x:0, y:+(H*.32).toFixed(1), width:W, height:+(H*.40).toFixed(1), fontSize:18, fontWeight:'800', color:'#0F172A', bg:'transparent', align:'center' },
        { id:'t_div2',  type:'line', x:0, y:+(H*.73).toFixed(1), width:W, height:0, fill:'#E2E8F0', strokeWidth:0.3 },
        { id:'t_qual',  type:'text', value:'{{quality}}', x:0, y:+(H*.75).toFixed(1), width:+(W*.35).toFixed(1), height:+(H*.25).toFixed(1), fontSize:9, fontWeight:'700', color:'#1D4ED8', bg:'transparent', align:'center' },
        { id:'t_std',   type:'text', value:'{{standard_code}}', x:+(W*.36).toFixed(1), y:+(H*.75).toFixed(1), width:+(W*.38).toFixed(1), height:+(H*.25).toFixed(1), fontSize:7, fontWeight:'600', color:'#64748B', bg:'transparent', align:'center' },
        { id:'t_name',  type:'text', value:'{{name}}', x:+(W*.75).toFixed(1), y:+(H*.75).toFixed(1), width:+(W*.24).toFixed(1), height:+(H*.25).toFixed(1), fontSize:5, fontWeight:'400', color:'#94A3B8', bg:'transparent', align:'center' },
      ];
    }
  },
  {
    id: 'karanlik', name: 'Karanlık', desc: 'Koyu zemin, amber vurgu',
    generate(W, H, s) {
      return [
        { id:'t_bg',    type:'rect', x:0, y:0, width:W, height:H, fill:'#1E293B', stroke:'none', strokeWidth:0, radius:0 },
        { id:'t_side',  type:'rect', x:0, y:0, width:+(W*.06).toFixed(1), height:H, fill:'#F59E0B', stroke:'none', strokeWidth:0, radius:0 },
        { id:'t_brand', type:'image', imageType:'brand', x:+(W*.08).toFixed(1), y:+(H*.03).toFixed(1), width:+(W*.25).toFixed(1), height:+(H*.28).toFixed(1), bg:'transparent' },
        { id:'t_code',  type:'text', value:'{{code}}', x:+(W*.35).toFixed(1), y:+(H*.04).toFixed(1), width:+(W*.63).toFixed(1), height:+(H*.28).toFixed(1), fontSize:8, fontWeight:'800', color:'#F8FAFC', bg:'transparent', align:'right', fontFamily:"'IBM Plex Mono','Courier New',monospace" },
        { id:'t_div',   type:'line', x:+(W*.08).toFixed(1), y:+(H*.33).toFixed(1), width:+(W*.90).toFixed(1), height:0, fill:'#334155', strokeWidth:0.5 },
        { id:'t_meas',  type:'text', value:'{{measurement}}', x:+(W*.08).toFixed(1), y:+(H*.35).toFixed(1), width:+(W*.60).toFixed(1), height:+(H*.38).toFixed(1), fontSize:14, fontWeight:'800', color:'#F8FAFC', bg:'transparent', align:'center' },
        { id:'t_qual',  type:'text', value:'{{quality}}', x:+(W*.70).toFixed(1), y:+(H*.35).toFixed(1), width:+(W*.28).toFixed(1), height:+(H*.20).toFixed(1), fontSize:10, fontWeight:'800', color:'#F59E0B', bg:'transparent', align:'center' },
        { id:'t_std',   type:'text', value:'{{standard_code}}', x:+(W*.70).toFixed(1), y:+(H*.56).toFixed(1), width:+(W*.28).toFixed(1), height:+(H*.17).toFixed(1), fontSize:6.5, fontWeight:'600', color:'#94A3B8', bg:'transparent', align:'center' },
        { id:'t_name',  type:'text', value:'{{name}}', x:+(W*.08).toFixed(1), y:+(H*.76).toFixed(1), width:+(W*.90).toFixed(1), height:+(H*.20).toFixed(1), fontSize:6.5, fontWeight:'500', color:'#94A3B8', bg:'transparent', align:'center' },
      ];
    }
  },
  {
    id: 'yatay_bantlar', name: 'Yatay Bantlar', desc: '3 renkli yatay dilim',
    generate(W, H, s) {
      return [
        { id:'t_b1',    type:'rect', x:0, y:0, width:W, height:+(H*.33).toFixed(1), fill:'#EFF6FF', stroke:'none', strokeWidth:0, radius:0 },
        { id:'t_b3',    type:'rect', x:0, y:+(H*.71).toFixed(1), width:W, height:+(H*.29).toFixed(1), fill:'#F8FAFC', stroke:'none', strokeWidth:0, radius:0 },
        { id:'t_brand', type:'image', imageType:'brand', x:1, y:0.5, width:+(W*.22).toFixed(1), height:+(H*.31).toFixed(1), bg:'transparent' },
        { id:'t_code',  type:'text', value:'{{code}}', x:+(W*.24).toFixed(1), y:0.5, width:+(W*.75).toFixed(1), height:+(H*.16).toFixed(1), fontSize:8.5, fontWeight:'800', color:'#1D4ED8', bg:'transparent', align:'right' },
        { id:'t_qual',  type:'text', value:'{{quality}}  {{standard_code}}', x:+(W*.24).toFixed(1), y:+(H*.17).toFixed(1), width:+(W*.75).toFixed(1), height:+(H*.15).toFixed(1), fontSize:6.5, fontWeight:'600', color:'#64748B', bg:'transparent', align:'right' },
        { id:'t_meas',  type:'text', value:'{{measurement}}', x:0, y:+(H*.34).toFixed(1), width:W, height:+(H*.36).toFixed(1), fontSize:16, fontWeight:'800', color:'#0F172A', bg:'transparent', align:'center' },
        { id:'t_name',  type:'text', value:'{{name}}', x:1, y:+(H*.72).toFixed(1), width:+(W*.75).toFixed(1), height:+(H*.27).toFixed(1), fontSize:6.5, fontWeight:'500', color:'#374151', bg:'transparent', align:'center' },
        { id:'t_pimg',  type:'image', imageType:'product', x:+(W*.77).toFixed(1), y:+(H*.68).toFixed(1), width:+(W*.22).toFixed(1), height:+(H*.31).toFixed(1), bg:'#F3F4F6' },
      ];
    }
  },
  {
    id: 'kirmizi_vurgu', name: 'Kırmızı Vurgu', desc: 'Kırmızı aksan, acil/önemli',
    generate(W, H, s) {
      return [
        { id:'t_side',  type:'rect', x:0, y:0, width:+(W*.08).toFixed(1), height:H, fill:'#DC2626', stroke:'none', strokeWidth:0, radius:0 },
        { id:'t_code',  type:'text', value:'{{code}}', x:+(W*.10).toFixed(1), y:0.5, width:+(W*.89).toFixed(1), height:+(H*.25).toFixed(1), fontSize:9.5, fontWeight:'800', color:'#0F172A', bg:'transparent', align:'left', fontFamily:"'IBM Plex Mono','Courier New',monospace" },
        { id:'t_div',   type:'line', x:+(W*.10).toFixed(1), y:+(H*.26).toFixed(1), width:+(W*.88).toFixed(1), height:0, fill:'#E2E8F0', strokeWidth:0.4 },
        { id:'t_meas',  type:'text', value:'{{measurement}}', x:+(W*.10).toFixed(1), y:+(H*.28).toFixed(1), width:+(W*.60).toFixed(1), height:+(H*.37).toFixed(1), fontSize:14, fontWeight:'800', color:'#0F172A', bg:'transparent', align:'center' },
        { id:'t_qual',  type:'text', value:'{{quality}}', x:+(W*.71).toFixed(1), y:+(H*.28).toFixed(1), width:+(W*.28).toFixed(1), height:+(H*.19).toFixed(1), fontSize:10, fontWeight:'800', color:'#DC2626', bg:'#FEF2F2', align:'center' },
        { id:'t_std',   type:'text', value:'{{standard_code}}', x:+(W*.71).toFixed(1), y:+(H*.48).toFixed(1), width:+(W*.28).toFixed(1), height:+(H*.17).toFixed(1), fontSize:7, fontWeight:'600', color:'#64748B', bg:'transparent', align:'center' },
        { id:'t_name',  type:'text', value:'{{name}}', x:+(W*.10).toFixed(1), y:+(H*.66).toFixed(1), width:+(W*.89).toFixed(1), height:+(H*.20).toFixed(1), fontSize:6.5, fontWeight:'500', color:'#374151', bg:'transparent', align:'left' },
        { id:'t_brand', type:'image', imageType:'brand', x:+(W*.10).toFixed(1), y:+(H*.87).toFixed(1), width:+(W*.25).toFixed(1), height:+(H*.12).toFixed(1), bg:'transparent' },
        { id:'t_date',  type:'text', value:'{{print_date}}', x:+(W*.36).toFixed(1), y:+(H*.87).toFixed(1), width:+(W*.62).toFixed(1), height:+(H*.12).toFixed(1), fontSize:5, fontWeight:'400', color:'#94A3B8', bg:'transparent', align:'right', fontFamily:"'IBM Plex Mono','Courier New',monospace" },
      ];
    }
  },
  {
    id: 'yesil_vurgu', name: 'Yeşil Vurgu', desc: 'Yeşil aksan, onaylı stok',
    generate(W, H, s) {
      return [
        { id:'t_tbar',  type:'rect', x:0, y:0, width:W, height:+(H*.32).toFixed(1), fill:'#15803D', stroke:'none', strokeWidth:0, radius:0 },
        { id:'t_code',  type:'text', value:'{{code}}', x:1, y:0, width:+(W*.70-1).toFixed(1), height:+(H*.32).toFixed(1), fontSize:10, fontWeight:'800', color:'#FFFFFF', bg:'transparent', align:'center', fontFamily:"'IBM Plex Mono','Courier New',monospace" },
        { id:'t_brand', type:'image', imageType:'brand', x:+(W*.72).toFixed(1), y:+(H*.02).toFixed(1), width:+(W*.26).toFixed(1), height:+(H*.28).toFixed(1), bg:'transparent' },
        { id:'t_meas',  type:'text', value:'{{measurement}}', x:0, y:+(H*.33).toFixed(1), width:+(W*.65).toFixed(1), height:+(H*.40).toFixed(1), fontSize:16, fontWeight:'800', color:'#0F172A', bg:'transparent', align:'center' },
        { id:'t_qual',  type:'text', value:'{{quality}}', x:+(W*.66).toFixed(1), y:+(H*.33).toFixed(1), width:+(W*.33).toFixed(1), height:+(H*.20).toFixed(1), fontSize:10, fontWeight:'800', color:'#15803D', bg:'#DCFCE7', align:'center' },
        { id:'t_std',   type:'text', value:'{{standard_code}}', x:+(W*.66).toFixed(1), y:+(H*.54).toFixed(1), width:+(W*.33).toFixed(1), height:+(H*.19).toFixed(1), fontSize:7, fontWeight:'600', color:'#64748B', bg:'transparent', align:'center' },
        { id:'t_name',  type:'text', value:'{{name}}', x:0, y:+(H*.74).toFixed(1), width:W, height:+(H*.19).toFixed(1), fontSize:6.5, fontWeight:'500', color:'#374151', bg:'#F8FAFC', align:'center' },
        { id:'t_date',  type:'text', value:'{{print_date}}', x:0, y:+(H*.93).toFixed(1), width:W, height:+(H*.07).toFixed(1), fontSize:4.5, fontWeight:'400', color:'#94A3B8', bg:'transparent', align:'right', fontFamily:"'IBM Plex Mono','Courier New',monospace" },
      ];
    }
  },
];

function defaultEls(W, H) {
  return [
    { id: 'brand', type: 'image', imageType: 'brand', x: 0, y: 0, width: +(W*.31).toFixed(1), height: +(H*.41).toFixed(1), bg: '#FAFAFA' },
    { id: 'pimg',  type: 'image', imageType: 'product', x: +(W*.31).toFixed(1), y: 0, width: +(W*.69).toFixed(1), height: +(H*.30).toFixed(1), bg: 'transparent' },
    { id: 'din',   type: 'text', value: '{{standard_code}}  {{quality}}', x: +(W*.31).toFixed(1), y: +(H*.30).toFixed(1), width: +(W*.69).toFixed(1), height: +(H*.11).toFixed(1), fontSize: 6.5, fontWeight: '600', color: '#374151', bg: '#E5E7EB', align: 'center', isQualityBar: true },
    { id: 'ol',    type: 'text', value: 'ÖLÇÜ', x: 0, y: +(H*.41).toFixed(1), width: +(W*.16).toFixed(1), height: +(H*.29).toFixed(1), fontSize: 5.5, fontWeight: '700', color: '#4B5563', bg: '#F8FAFC', align: 'center', vertical: true },
    { id: 'ov',    type: 'text', value: '{{measurement}}', x: +(W*.16).toFixed(1), y: +(H*.41).toFixed(1), width: +(W*.84).toFixed(1), height: +(H*.29).toFixed(1), fontSize: 13, fontWeight: '800', color: '#0F172A', bg: 'transparent', align: 'center' },
    { id: 'ul',    type: 'text', value: 'ÜRÜN', x: 0, y: +(H*.70).toFixed(1), width: +(W*.16).toFixed(1), height: +(H*.30).toFixed(1), fontSize: 5.5, fontWeight: '700', color: '#4B5563', bg: '#F8FAFC', align: 'center', vertical: true },
    { id: 'uv',    type: 'text', value: '{{name}}', x: +(W*.16).toFixed(1), y: +(H*.70).toFixed(1), width: +(W*.84).toFixed(1), height: +(H*.30).toFixed(1), fontSize: 7.5, fontWeight: '700', color: '#0F172A', bg: 'transparent', align: 'center' },
  ];
}

export default function LabelDesigner() {
  const { formatId } = useParams();
  const navigate = useNavigate();
  const { fetchFormats, settings } = useAppSettings();

  const [format, setFormat] = useState(null);
  const [allFormats, setAllFormats] = useState([]);
  const [customSizes, setCustomSizes] = useState(() => {
    try { return JSON.parse(localStorage.getItem('label_printer_formats') || '[]'); }
    catch { return []; }
  });
  const [elements, setElements] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [tool, setTool] = useState('select');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [catalogModal, setCatalogModal] = useState(false);
  const [catalogName, setCatalogName] = useState('');
  const [showGrid, setShowGrid] = useState(true);
  const [zoom, setZoom] = useState(1.0);
  const [categories, setCategories] = useState([]);
  const [expandedCat, setExpandedCat] = useState(null);
  const [templatePanelOpen, setTemplatePanelOpen] = useState(false);
  const [alignPanelOpen, setAlignPanelOpen] = useState(false);
  const [snapGuides, setSnapGuides] = useState([]);
  const [currentTemplateIdx, setCurrentTemplateIdx] = useState(0);

  // Line drawing
  const [pencilColor, setPencilColor] = useState('#374151');
  const [pencilWidth, setPencilWidth] = useState(0.5);
  const [lineStart, setLineStart] = useState(null);
  const [lineEnd, setLineEnd] = useState(null);
  const [snapInfo, setSnapInfo] = useState(null); // { type: 'angle'|'point', pt }
  const isDrawingRef = useRef(false);

  // Undo history
  const historyRef = useRef([]);
  const historyIdxRef = useRef(-1);

  // Refs for stale-closure-free access
  const zoomRef = useRef(1.0);
  const elementsRef = useRef([]);
  const toolRef = useRef('select');

  const canvasRef = useRef(null);
  const svgRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { elementsRef.current = elements; }, [elements]);
  useEffect(() => { toolRef.current = tool; }, [tool]);

  useEffect(() => {
    axios.get(`${BACKEND_URL}/api/label-formats`).then(res => {
      setAllFormats(res.data);
      const fmt = res.data.find(f => f.id === formatId);
      if (fmt) {
        setFormat(fmt);
        const els = fmt.elements?.length > 0 ? fmt.elements : defaultEls(fmt.label_width, fmt.label_height);
        setElements(els);
        historyRef.current = [els.map(e => ({ ...e }))];
        historyIdxRef.current = 0;
      }
      setLoading(false);
    }).catch(() => setLoading(false));
    axios.get(`${BACKEND_URL}/api/categories`).then(res => {
      setCategories(res.data);
      if (res.data.length > 0) setExpandedCat(res.data[0].id);
    }).catch(() => {});
  }, [formatId]);

  // ── Ctrl+Scroll zoom ──────────────────────────────────────────────────
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handler = (e) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.1 : -0.1;
      const next = Math.min(3.0, Math.max(0.25, +((zoomRef.current + delta)).toFixed(2)));
      zoomRef.current = next;
      setZoom(next);
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, []);

  const W = format?.label_width || 64;
  const H = format?.label_height || 34;
  const CW = W * SCALE;
  const CH = H * SCALE;

  const handleFormatChange = (value) => {
    if (!value) return;
    if (value.startsWith('custom:')) {
      // Label printer custom size — change canvas locally
      const cs = customSizes.find(s => `custom:${s.id}` === value);
      if (!cs) return;
      const newFmt = { ...format, label_width: cs.width, label_height: cs.height, name: cs.name, _isCustom: true };
      setFormat(newFmt);
      const els = defaultEls(cs.width, cs.height);
      setElements(els);
      historyRef.current = [els.map(e => ({ ...e }))];
      historyIdxRef.current = 0;
      setSelectedId(null);
    } else {
      // TANEX format — navigate to its designer page
      navigate(`/label-designer/${value}`);
    }
  };

  // ── Coordinate helpers ────────────────────────────────────────────────
  // screen pixels → mm (accounts for zoom)
  const toMm = (px) => px / (SCALE * zoomRef.current);
  const getSvgPt = (e) => {
    const rect = svgRef.current.getBoundingClientRect();
    return [+(toMm(e.clientX - rect.left)).toFixed(1), +(toMm(e.clientY - rect.top)).toFixed(1)];
  };

  // ── Snap helpers ──────────────────────────────────────────────────────
  const getSnapPoints = useCallback(() => {
    const pts = [];
    elementsRef.current.forEach(el => {
      const { x, y, width: w = 0, height: h = 0 } = el;
      pts.push(
        [x, y], [x+w, y], [x+w, y+h], [x, y+h],          // corners
        [x+w/2, y], [x+w, y+h/2], [x+w/2, y+h], [x, y+h/2], // midpoints
        [x+w/2, y+h/2],                                       // center
      );
    });
    return pts;
  }, []);

  const applySnap = useCallback((start, end) => {
    if (!start) return { pt: end, type: null };
    const [sx, sy] = start;
    const [ex, ey] = end;
    const dx = ex - sx, dy = ey - sy;
    const len = Math.sqrt(dx*dx + dy*dy);
    if (len < 0.1) return { pt: end, type: null };

    // Only axis snap (H/V) — no corner/point snap
    const ang = Math.abs(Math.atan2(dy, dx) * 180 / Math.PI);
    if (ang < SNAP_ANGLE || ang > 180 - SNAP_ANGLE) return { pt: [ex, sy], type: 'angle' }; // horizontal
    if (Math.abs(ang - 90) < SNAP_ANGLE)              return { pt: [sx, ey], type: 'angle' }; // vertical

    return { pt: end, type: null };
  }, []);

  // ── Undo ──────────────────────────────────────────────────────────────
  const saveHistory = useCallback((els) => {
    const h = historyRef.current.slice(0, historyIdxRef.current + 1);
    h.push(els.map(e => ({ ...e })));
    historyRef.current = h.slice(-50);
    historyIdxRef.current = historyRef.current.length - 1;
  }, []);

  const setElsWithHistory = useCallback((updater) => {
    setElements(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      saveHistory(next);
      return next;
    });
  }, [saveHistory]);

  const updateElement = useCallback((id, updates) => {
    setElements(prev => prev.map(el => el.id === id ? { ...el, ...updates } : el));
  }, []);

  const commitUpdate = useCallback(() => {
    setElements(curr => { saveHistory(curr); return curr; });
  }, [saveHistory]);

  const undo = useCallback(() => {
    if (historyIdxRef.current <= 0) { toast.info('Daha fazla geri alınamaz'); return; }
    historyIdxRef.current -= 1;
    setElements(historyRef.current[historyIdxRef.current].map(e => ({ ...e })));
    setSelectedId(null);
    toast.info('Geri alındı');
  }, []);

  const selectedEl = elements.find(el => el.id === selectedId);

  // ── Drag (with magnetic snap) ──────────────────────────────────────────
  const SNAP_MM = 1.5;
  const startDrag = useCallback((e, el) => {
    e.preventDefault(); e.stopPropagation();
    setSelectedId(el.id);
    const startMX = e.clientX, startMY = e.clientY;
    const startX = el.x, startY = el.y;
    const elW = el.width || 0, elH = el.height || 0;
    let moved = false;

    const computeSnap = (rawX, rawY) => {
      const others = elementsRef.current.filter(e2 => e2.id !== el.id);
      const xCands = [
        { pos: 0 }, { pos: W - elW }, { pos: (W - elW) / 2 },
        ...others.flatMap(o => {
          const ow = o.width || 0;
          return [
            { pos: o.x }, { pos: o.x + ow - elW }, { pos: o.x + (ow - elW) / 2 },
            { pos: o.x + ow }, { pos: o.x - elW },
          ];
        }),
      ];
      const yCands = [
        { pos: 0 }, { pos: H - elH }, { pos: (H - elH) / 2 },
        ...others.flatMap(o => {
          const oh = o.height || 0;
          return [
            { pos: o.y }, { pos: o.y + oh - elH }, { pos: o.y + (oh - elH) / 2 },
            { pos: o.y + oh }, { pos: o.y - elH },
          ];
        }),
      ];
      let snapX = rawX, snapY = rawY;
      const guides = [];
      let bestX = SNAP_MM;
      for (const c of xCands) {
        const d = Math.abs(rawX - c.pos);
        if (d < bestX) { bestX = d; snapX = c.pos; guides[0] = { axis:'x', pos:c.pos }; }
      }
      let bestY = SNAP_MM;
      for (const c of yCands) {
        const d = Math.abs(rawY - c.pos);
        if (d < bestY) { bestY = d; snapY = c.pos; guides[1] = { axis:'y', pos:c.pos }; }
      }
      setSnapGuides(guides.filter(Boolean));
      return {
        x: +(Math.max(0, Math.min(W - elW, snapX)).toFixed(1)),
        y: +(Math.max(0, Math.min(H - elH, snapY)).toFixed(1)),
      };
    };

    const onMove = (e) => {
      moved = true;
      const dx = toMm(e.clientX - startMX), dy = toMm(e.clientY - startMY);
      const { x: newX, y: newY } = computeSnap(startX + dx, startY + dy);
      setElements(prev => prev.map(el2 => el2.id !== el.id ? el2 : { ...el2, x: newX, y: newY }));
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      setSnapGuides([]);
      if (moved) setElements(curr => { saveHistory(curr); return curr; });
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saveHistory, W, H]);

  // ── Resize ────────────────────────────────────────────────────────────
  const startResize = useCallback((e, el, corner) => {
    e.preventDefault(); e.stopPropagation();
    const startMX = e.clientX, startMY = e.clientY;
    const { x: sx, y: sy, width: sw, height: sh } = el;
    const onMove = (e) => {
      const dx = toMm(e.clientX - startMX), dy = toMm(e.clientY - startMY);
      let nx = sx, ny = sy, nw = sw, nh = sh;
      if (corner.includes('e')) nw = Math.max(1, sw + dx);
      if (corner.includes('s')) nh = Math.max(0.5, sh + dy);
      if (corner.includes('w')) { nx = sx + dx; nw = Math.max(1, sw - dx); }
      if (corner.includes('n')) { ny = sy + dy; nh = Math.max(0.5, sh - dy); }
      setElements(prev => prev.map(el2 => el2.id !== el.id ? el2 : {
        ...el2, x: +nx.toFixed(1), y: +ny.toFixed(1), width: +nw.toFixed(1), height: +nh.toFixed(1),
      }));
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      setElements(curr => { saveHistory(curr); return curr; });
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saveHistory]);

  // ── Line drawing ──────────────────────────────────────────────────────
  const handleSvgMouseDown = (e) => {
    if (toolRef.current !== 'pencil') return;
    e.preventDefault();
    isDrawingRef.current = true;
    const pt = getSvgPt(e);
    setLineStart(pt); setLineEnd(pt); setSnapInfo(null);
  };
  const handleSvgMouseMove = (e) => {
    if (!isDrawingRef.current || toolRef.current !== 'pencil') return;
    const raw = getSvgPt(e);
    const { pt, type } = applySnap(lineStart, raw);
    setLineEnd(pt);
    setSnapInfo(type ? { type, pt } : null);
  };
  const handleSvgMouseUp = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    if (lineStart && lineEnd) {
      const dx = lineEnd[0]-lineStart[0], dy = lineEnd[1]-lineStart[1];
      if (Math.sqrt(dx*dx+dy*dy) > 0.3) {
        const id = `path_${Date.now()}`;
        const newEl = { id, type:'path', points:[lineStart,lineEnd], x:Math.min(lineStart[0],lineEnd[0]), y:Math.min(lineStart[1],lineEnd[1]), width:Math.abs(dx)||0.3, height:Math.abs(dy)||0.3, stroke:pencilColor, strokeWidth:pencilWidth };
        setElsWithHistory(prev => [...prev, newEl]);
        setSelectedId(id);
      }
    }
    setLineStart(null); setLineEnd(null); setSnapInfo(null);
  };

  // ── Add element ────────────────────────────────────────────────────────
  const addElement = (type) => {
    const id = `el_${Date.now()}`;
    const defs = {
      text:          { type:'text', value:'Metin...', width:W*.55, height:H*.22, fontSize:settings.label_default_font_size||8, fontFamily:settings.label_font_family||'', fontWeight:'400', color:'#0F172A', bg:'transparent', align:'left' },
      image_product: { type:'image', imageType:'product', width:W*.28, height:H*.38, bg:'#F3F4F6' },
      image_brand:   { type:'image', imageType:'brand', width:W*.28, height:H*.38, bg:'#FAFAFA' },
      rect:     { type:'rect',  width:W*.4, height:H*.22, fill:'none', stroke:'#374151', strokeWidth:0.5, radius:0 },
      circle:   { type:'circle', width:Math.min(W,H)*.3, height:Math.min(W,H)*.3, fill:'none', stroke:'#374151', strokeWidth:0.5 },
      triangle: { type:'triangle', width:W*.3, height:H*.22, fill:'none', stroke:'#374151', strokeWidth:0.5 },
      line:     { type:'line', width:W*.7, height:0.3, fill:'#374151', strokeWidth:0.3 },
    };
    setElsWithHistory(prev => [...prev, { id, x:W*.1, y:H*.1, ...(defs[type]||{}) }]);
    setSelectedId(id); setTool('select');
  };

  const addFieldElement = useCallback((field) => {
    const id = `field_${Date.now()}`;
    const newEl = {
      id, type: 'text',
      value: field.var || `{{field:${field.id}}}`,
      x: +(W * 0.1).toFixed(1), y: +(H * 0.1).toFixed(1),
      width: +(W * 0.8).toFixed(1), height: +(H * 0.2).toFixed(1),
      fontSize: settings.label_default_font_size||8, fontFamily: settings.label_font_family||'', fontWeight: '600', color: '#0F172A',
      bg: 'transparent', align: 'center',
      fieldId: field.id, fieldName: field.name,
      colorRules: field.colorRules || [],
    };
    setElsWithHistory(prev => [...prev, newEl]);
    setSelectedId(id);
    setTool('select');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [W, H, settings, setElsWithHistory]);

  const deleteSelected = useCallback(() => {
    if (!selectedId) return;
    setElsWithHistory(prev => prev.filter(e => e.id !== selectedId));
    setSelectedId(null);
  }, [selectedId, setElsWithHistory]);

  const duplicate = useCallback(() => {
    const el = elementsRef.current.find(e => e.id === selectedId);
    if (!el) return;
    const n = { ...el, id:`el_${Date.now()}`, x:el.x+3, y:el.y+3 };
    setElsWithHistory(prev => [...prev, n]);
    setSelectedId(n.id);
  }, [selectedId, setElsWithHistory]);

  const moveLayer = (dir) => {
    const idx = elements.findIndex(e => e.id === selectedId); if (idx < 0) return;
    const next = [...elements];
    if (dir==='up'&&idx<next.length-1) [next[idx],next[idx+1]]=[next[idx+1],next[idx]];
    else if (dir==='down'&&idx>0) [next[idx],next[idx-1]]=[next[idx-1],next[idx]];
    setElsWithHistory(() => next);
  };

  const resetToDefault = () => {
    if (!window.confirm('Tasarım sıfırlanacak?')) return;
    setElsWithHistory(() => defaultEls(W, H)); setSelectedId(null);
  };

  const applyTemplate = (tpl, idx) => {
    const newEls = tpl.generate(W, H, settings).map((el, i) => ({ ...el, id: `${el.id}_${Date.now()}_${i}` }));
    setElsWithHistory(() => newEls);
    setSelectedId(null);
    setCurrentTemplateIdx(idx);
    setTemplatePanelOpen(false);
    toast.success(`"${tpl.name}" şablonu uygulandı`);
  };

  const shuffleTemplate = () => {
    const nextIdx = (currentTemplateIdx + 1) % TEMPLATES.length;
    applyTemplate(TEMPLATES[nextIdx], nextIdx);
  };

  const alignEls = (type) => {
    const MARGIN = 0.5;
    setElsWithHistory(prev => {
      const sorted = [...prev].sort((a, b) => a.y - b.y);
      const sortedX = [...prev].sort((a, b) => a.x - b.x);
      switch (type) {
        case 'left':   return prev.map(el => ({ ...el, x: 0 }));
        case 'cx':     return prev.map(el => ({ ...el, x: +((W - (el.width||0)) / 2).toFixed(1) }));
        case 'right':  return prev.map(el => ({ ...el, x: +(Math.max(0, W - (el.width||0))).toFixed(1) }));
        case 'top':    return prev.map(el => ({ ...el, y: 0 }));
        case 'cy':     return prev.map(el => ({ ...el, y: +((H - (el.height||0)) / 2).toFixed(1) }));
        case 'bottom': return prev.map(el => ({ ...el, y: +(Math.max(0, H - (el.height||0))).toFixed(1) }));
        case 'dist-y': {
          const totalH = sorted.reduce((sum, el) => sum + (el.height||0), 0);
          const gap = sorted.length > 1 ? Math.max(0, (H - 2*MARGIN - totalH) / (sorted.length - 1)) : 0;
          let curY = MARGIN;
          return sorted.map(el => { const n = { ...el, y: +(curY.toFixed(1)) }; curY += (el.height||0) + gap; return n; });
        }
        case 'dist-x': {
          const totalW = sortedX.reduce((sum, el) => sum + (el.width||0), 0);
          const gap = sortedX.length > 1 ? Math.max(0, (W - 2*MARGIN - totalW) / (sortedX.length - 1)) : 0;
          let curX = MARGIN;
          return sortedX.map(el => { const n = { ...el, x: +(curX.toFixed(1)) }; curX += (el.width||0) + gap; return n; });
        }
        case 'auto': {
          const totalH = sorted.reduce((sum, el) => sum + (el.height||0), 0);
          const gap = sorted.length > 1 ? Math.max(0.3, (H - 2*MARGIN - totalH) / (sorted.length - 1)) : 0;
          let curY = MARGIN;
          return sorted.map(el => { const n = { ...el, x: 0, width: W, y: +(curY.toFixed(1)) }; curY += (el.height||0) + gap; return n; });
        }
        default: return prev;
      }
    });
    toast.success('Hizalandı');
  };

  // ── Keyboard ──────────────────────────────────────────────────────────
  useEffect(() => {
    const fn = (e) => {
      if (['INPUT','TEXTAREA'].includes(document.activeElement.tagName)) return;
      if (e.key==='Delete'||e.key==='Backspace') deleteSelected();
      if ((e.ctrlKey||e.metaKey)&&e.key==='z') { e.preventDefault(); undo(); }
      if ((e.ctrlKey||e.metaKey)&&e.key==='d') { e.preventDefault(); duplicate(); }
    };
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, [deleteSelected, undo, duplicate]);

  const handleSave = async () => {
    setSaving(true);
    try { await axios.put(`${BACKEND_URL}/api/label-formats/${formatId}`, { elements }); await fetchFormats(); toast.success('Tasarım kaydedildi!'); }
    catch { toast.error('Kaydetme başarısız'); }
    finally { setSaving(false); }
  };

  const handleSaveToCatalog = async () => {
    if (!catalogName.trim()) { toast.error('Tasarım adı boş olamaz'); return; }
    setSaving(true);
    try {
      await axios.put(`${BACKEND_URL}/api/label-formats/${formatId}`, { elements });
      const res = await axios.post(`${BACKEND_URL}/api/designs`, { name: catalogName.trim(), elements, background: format?.background || '#FFFFFF' });
      await axios.put(`${BACKEND_URL}/api/label-formats/${formatId}`, { design_id: res.data.id });
      await fetchFormats();
      toast.success(`"${catalogName}" kataloğa eklendi ve şablona atandı!`);
      setCatalogModal(false); setCatalogName('');
    } catch { toast.error('Kaydetme başarısız'); }
    finally { setSaving(false); }
  };

  if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh'}}><div style={{width:'28px',height:'28px',border:'3px solid #0B4F8A',borderTopColor:'transparent',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/></div>;
  if (!format) return <div style={{padding:'20px',color:'#DC2626'}}>Format bulunamadı</div>;

  // Snap points for ALL elements (no longer shown — only angle snap active)
  // const allSnapPts = ...

  const numInp = (label, field, min=0, max=200, step=0.5) => (
    <div>
      <label style={{display:'block',fontSize:'10px',color:'#64748B',marginBottom:'2px'}}>{label}</label>
      <input type="number" min={min} max={max} step={step} value={selectedEl?.[field]??''} onChange={e=>updateElement(selectedId,{[field]:parseFloat(e.target.value)||0})} onBlur={commitUpdate}
        style={{width:'100%',boxSizing:'border-box',padding:'5px 7px',fontSize:'12px',fontFamily:"'IBM Plex Mono',monospace",border:'1px solid #E2E8F0',borderRadius:'6px',outline:'none',color:'#0F172A',backgroundColor:'#fff'}}/>
    </div>
  );

  const tb = (id, icon, label) => (
    <button key={id} title={label} onClick={()=>setTool(id)}
      style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'2px',padding:'7px 5px',borderRadius:'8px',border:`1.5px solid ${tool===id?'#0B4F8A':'#E2E8F0'}`,backgroundColor:tool===id?'#EFF6FF':'#fff',cursor:'pointer',minWidth:'40px'}}>
      {icon}
      <span style={{fontSize:'9px',color:tool===id?'#0B4F8A':'#64748B',fontWeight:tool===id?700:400}}>{label}</span>
    </button>
  );

  const resHP = [
    {c:'nw',t:0,l:0},{c:'n',t:0,l:'calc(50% - 4px)'},{c:'ne',t:0,l:'calc(100% - 8px)'},
    {c:'e',t:'calc(50% - 4px)',l:'calc(100% - 8px)'},{c:'se',t:'calc(100% - 8px)',l:'calc(100% - 8px)'},
    {c:'s',t:'calc(100% - 8px)',l:'calc(50% - 4px)'},{c:'sw',t:'calc(100% - 8px)',l:0},{c:'w',t:'calc(50% - 4px)',l:0},
  ];

  return (
    <div style={{height:'100vh',display:'flex',flexDirection:'column',backgroundColor:'#F1F5F9',overflow:'hidden'}}>

      {/* Top bar */}
      <div style={{display:'flex',alignItems:'center',gap:'10px',padding:'9px 18px',backgroundColor:'#0B4F8A',color:'#fff',flexShrink:0}}>
        <button onClick={()=>navigate('/settings')} style={{display:'flex',alignItems:'center',gap:'5px',padding:'5px 11px',backgroundColor:'rgba(255,255,255,0.15)',border:'1px solid rgba(255,255,255,0.25)',borderRadius:'7px',cursor:'pointer',color:'#fff',fontSize:'13px'}}>
          <ArrowLeft size={13}/> Geri
        </button>
        <div style={{flex:1,display:'flex',alignItems:'center',gap:'8px'}}>
          <select
            value={format?._isCustom ? `custom:${customSizes.find(s=>s.width===W&&s.height===H)?.id||''}` : (formatId||'')}
            onChange={e => handleFormatChange(e.target.value)}
            style={{padding:'5px 10px',fontSize:'13px',fontWeight:600,backgroundColor:'rgba(255,255,255,0.15)',border:'1px solid rgba(255,255,255,0.3)',borderRadius:'7px',color:'#fff',cursor:'pointer',outline:'none',fontFamily:"'Space Grotesk','Inter',sans-serif",maxWidth:'260px'}}
          >
            {allFormats.length > 0 && <optgroup label="A4 Formatları">
              {allFormats.map(f => <option key={f.id} value={f.id} style={{color:'#0F172A',backgroundColor:'#fff'}}>{f.name} ({f.label_width}×{f.label_height}mm)</option>)}
            </optgroup>}
            {customSizes.length > 0 && <optgroup label="Etiket Yazıcı Şablonları">
              {customSizes.map(s => <option key={s.id} value={`custom:${s.id}`} style={{color:'#0F172A',backgroundColor:'#fff'}}>{s.name} ({s.width}×{s.height}mm)</option>)}
            </optgroup>}
          </select>
          <span style={{fontSize:'12px',opacity:.7}}>{W}×{H}mm</span>
          {format?._isCustom && <span style={{fontSize:'10px',backgroundColor:'rgba(255,200,0,0.25)',color:'#FDE68A',padding:'2px 7px',borderRadius:'4px',border:'1px solid rgba(255,200,0,0.3)'}}>Özel boyut — sadece kataloğa kaydedin</span>}
        </div>
        {/* Zoom controls */}
        <div style={{display:'flex',alignItems:'center',gap:'4px',backgroundColor:'rgba(255,255,255,0.1)',borderRadius:'8px',padding:'3px 8px'}}>
          <button onClick={()=>{const n=Math.max(0.25,+(zoom-0.1).toFixed(2));zoomRef.current=n;setZoom(n);}} style={{padding:'3px 6px',background:'none',border:'none',cursor:'pointer',color:'#fff',display:'flex',alignItems:'center'}}><ZoomOut size={14}/></button>
          <span style={{fontSize:'12px',fontFamily:"'IBM Plex Mono',monospace",minWidth:'38px',textAlign:'center'}}>{Math.round(zoom*100)}%</span>
          <button onClick={()=>{const n=Math.min(3.0,+(zoom+0.1).toFixed(2));zoomRef.current=n;setZoom(n);}} style={{padding:'3px 6px',background:'none',border:'none',cursor:'pointer',color:'#fff',display:'flex',alignItems:'center'}}><ZoomIn size={14}/></button>
          <button onClick={()=>{zoomRef.current=1;setZoom(1);}} style={{padding:'2px 6px',background:'rgba(255,255,255,0.2)',border:'none',cursor:'pointer',color:'#fff',fontSize:'11px',borderRadius:'4px'}}>100%</button>
        </div>
        <button onClick={undo} title="Ctrl+Z" style={{display:'flex',alignItems:'center',gap:'4px',padding:'5px 10px',backgroundColor:'rgba(255,255,255,0.15)',border:'1px solid rgba(255,255,255,0.2)',borderRadius:'6px',cursor:'pointer',color:'#fff',fontSize:'12px'}}>
          <Undo2 size={13}/> Geri Al
        </button>
        <button onClick={()=>navigate('/designs')} title="Tasarımlarımı Gör" style={{display:'flex',alignItems:'center',gap:'4px',padding:'5px 10px',backgroundColor:'rgba(255,255,255,0.12)',border:'1px solid rgba(255,255,255,0.2)',borderRadius:'6px',cursor:'pointer',color:'#fff',fontSize:'12px'}}>
          <Layers size={13}/> Tasarımlarım
        </button>
        <button onClick={()=>setShowGrid(g=>!g)} style={{padding:'5px 10px',backgroundColor:showGrid?'rgba(255,255,255,0.2)':'transparent',border:'1px solid rgba(255,255,255,0.2)',borderRadius:'6px',cursor:'pointer',color:'#fff',fontSize:'12px',display:'flex',alignItems:'center',gap:'4px'}}>
          {showGrid?<Eye size={13}/>:<EyeOff size={13}/>}
        </button>
        <button onClick={resetToDefault} style={{padding:'5px 10px',backgroundColor:'transparent',border:'1px solid rgba(255,255,255,0.2)',borderRadius:'6px',cursor:'pointer',color:'#fff',fontSize:'12px',display:'flex',alignItems:'center',gap:'4px'}}>
          <RotateCcw size={13}/>
        </button>
        {!format?._isCustom && (
          <button onClick={handleSave} disabled={saving} style={{display:'flex',alignItems:'center',gap:'6px',padding:'7px 14px',backgroundColor:'rgba(255,255,255,0.15)',color:'#fff',border:'1px solid rgba(255,255,255,0.3)',borderRadius:'7px',cursor:saving?'not-allowed':'pointer',fontSize:'13px',fontWeight:600,opacity:saving?.7:1}}>
            {saving?<div style={{width:'13px',height:'13px',border:'2px solid #fff',borderTopColor:'transparent',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>:<Save size={14}/>} Kaydet
          </button>
        )}
        <button onClick={()=>{setCatalogName(format?.name||'');setCatalogModal(true);}} style={{display:'flex',alignItems:'center',gap:'6px',padding:'7px 14px',backgroundColor:'#fff',color:'#0B4F8A',border:'none',borderRadius:'7px',cursor:'pointer',fontSize:'13px',fontWeight:700}}>
          <Layers size={14}/> Kataloğa Kaydet
        </button>
      </div>

      {/* Toolbar */}
      <div style={{display:'flex',alignItems:'center',gap:'5px',padding:'7px 14px',backgroundColor:'#fff',borderBottom:'1px solid #E2E8F0',flexShrink:0,flexWrap:'wrap'}}>
        {tb('select',<MousePointer size={15} color={tool==='select'?'#0B4F8A':'#64748B'}/>,'Seç')}
        <div style={{width:'1px',height:'34px',backgroundColor:'#E2E8F0',margin:'0 2px'}}/>
        {tb('text',<Type size={15} color={tool==='text'?'#0B4F8A':'#64748B'}/>,'Metin')}
        {tb('img_p',<Image size={15} color='#64748B'/>,'Ürün')}
        {tb('img_b',<Tag size={15} color='#64748B'/>,'Logo')}
        <div style={{width:'1px',height:'34px',backgroundColor:'#E2E8F0',margin:'0 2px'}}/>
        {tb('rect',<Square size={15} color={tool==='rect'?'#0B4F8A':'#64748B'}/>,'Kare')}
        {tb('circle',<Circle size={15} color={tool==='circle'?'#0B4F8A':'#64748B'}/>,'Daire')}
        {tb('triangle',<Triangle size={15} color={tool==='triangle'?'#0B4F8A':'#64748B'}/>,'Üçgen')}
        {tb('line',<Minus size={15} color={tool==='line'?'#0B4F8A':'#64748B'}/>,'Çizgi')}
        <div style={{width:'1px',height:'34px',backgroundColor:'#E2E8F0',margin:'0 2px'}}/>
        {tb('pencil',<Pencil size={15} color={tool==='pencil'?'#0B4F8A':'#64748B'}/>,'Düz Çizgi')}
        {tool==='pencil'&&(
          <div style={{display:'flex',alignItems:'center',gap:'8px',padding:'4px 10px',backgroundColor:'#EFF6FF',border:'1px solid #BFDBFE',borderRadius:'8px'}}>
            <span style={{fontSize:'10px',color:'#1D4ED8',fontWeight:600}}>Çizgi:</span>
            <div><span style={{fontSize:'9px',color:'#64748B'}}>Renk</span><br/>
              <input type="color" value={pencilColor} onChange={e=>setPencilColor(e.target.value)} style={{width:'30px',height:'22px',padding:'1px',border:'1px solid #BFDBFE',borderRadius:'4px',cursor:'pointer'}}/></div>
            <div><span style={{fontSize:'9px',color:'#64748B'}}>Kalınlık mm</span><br/>
              <input type="number" min={0.1} max={5} step={0.1} value={pencilWidth} onChange={e=>setPencilWidth(parseFloat(e.target.value)||0.5)} style={{width:'46px',padding:'2px 5px',fontSize:'12px',fontFamily:"'IBM Plex Mono',monospace",border:'1px solid #BFDBFE',borderRadius:'4px',outline:'none'}}/></div>
            <span style={{fontSize:'10px',color:'#64748B',lineHeight:1.4}}>🔵 Yatay/Dikey snap ±12°</span>
          </div>
        )}
        <div style={{width:'1px',height:'34px',backgroundColor:'#E2E8F0',margin:'0 2px'}}/>
        {/* Template + Align + Shuffle */}
        <button onClick={()=>{setTemplatePanelOpen(o=>!o);setAlignPanelOpen(false);}}
          style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'2px',padding:'7px 8px',borderRadius:'8px',border:`1.5px solid ${templatePanelOpen?'#7C3AED':'#E2E8F0'}`,backgroundColor:templatePanelOpen?'#EDE9FE':'#fff',cursor:'pointer',minWidth:'44px'}}>
          <Sparkles size={15} color={templatePanelOpen?'#7C3AED':'#64748B'}/>
          <span style={{fontSize:'9px',color:templatePanelOpen?'#7C3AED':'#64748B',fontWeight:templatePanelOpen?700:400}}>Şablon</span>
        </button>
        <button onClick={shuffleTemplate} title="Sonraki şablona geç"
          style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'2px',padding:'7px 8px',borderRadius:'8px',border:'1.5px solid #E2E8F0',backgroundColor:'#fff',cursor:'pointer',minWidth:'44px'}}>
          <Shuffle size={15} color='#64748B'/>
          <span style={{fontSize:'9px',color:'#64748B'}}>⟳ Yeni</span>
        </button>
        <button onClick={()=>{setAlignPanelOpen(o=>!o);setTemplatePanelOpen(false);}}
          style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'2px',padding:'7px 8px',borderRadius:'8px',border:`1.5px solid ${alignPanelOpen?'#0B4F8A':'#E2E8F0'}`,backgroundColor:alignPanelOpen?'#EFF6FF':'#fff',cursor:'pointer',minWidth:'44px'}}>
          <AlignCenter size={15} color={alignPanelOpen?'#0B4F8A':'#64748B'}/>
          <span style={{fontSize:'9px',color:alignPanelOpen?'#0B4F8A':'#64748B',fontWeight:alignPanelOpen?700:400}}>Hizala</span>
        </button>
        <div style={{width:'1px',height:'34px',backgroundColor:'#E2E8F0',margin:'0 2px'}}/>
        <button onClick={()=>{const t=tool.startsWith('img')?`image_${tool.split('_')[1]==='p'?'product':'brand'}`:tool; addElement(t);}} disabled={tool==='select'||tool==='pencil'}
          style={{display:'flex',alignItems:'center',gap:'5px',padding:'7px 12px',fontSize:'12px',fontWeight:600,backgroundColor:tool!=='select'&&tool!=='pencil'?'#0B4F8A':'#E2E8F0',color:tool!=='select'&&tool!=='pencil'?'#fff':'#94A3B8',border:'none',borderRadius:'8px',cursor:tool!=='select'&&tool!=='pencil'?'pointer':'not-allowed'}}>
          <Plus size={13}/> Ekle
        </button>
        {selectedId&&(<>
          <div style={{width:'1px',height:'34px',backgroundColor:'#E2E8F0',margin:'0 2px'}}/>
          <button onClick={duplicate} title="Ctrl+D" style={{padding:'6px',border:'1px solid #E2E8F0',borderRadius:'7px',background:'#fff',cursor:'pointer',display:'flex'}}><Copy size={13} color='#64748B'/></button>
          <button onClick={()=>moveLayer('up')} style={{padding:'6px',border:'1px solid #E2E8F0',borderRadius:'7px',background:'#fff',cursor:'pointer',display:'flex'}}><ChevronUp size={13} color='#64748B'/></button>
          <button onClick={()=>moveLayer('down')} style={{padding:'6px',border:'1px solid #E2E8F0',borderRadius:'7px',background:'#fff',cursor:'pointer',display:'flex'}}><ChevronDown size={13} color='#64748B'/></button>
          <button onClick={deleteSelected} title="Del" style={{padding:'6px',border:'1px solid #FCA5A5',borderRadius:'7px',background:'#FEF2F2',cursor:'pointer',display:'flex'}}><Trash2 size={13} color='#DC2626'/></button>
        </>)}
      </div>

      {/* ── Template Panel ── */}
      {templatePanelOpen && (
        <div style={{backgroundColor:'#1E1B4B',borderBottom:'1px solid #312E81',padding:'12px 16px',flexShrink:0}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'10px'}}>
            <span style={{fontSize:'12px',fontWeight:700,color:'#C4B5FD',display:'flex',alignItems:'center',gap:'6px'}}><Sparkles size={13}/> Hazır Şablon Seç — Tıkla, uygula, sonra istediğin gibi düzenle</span>
            <button onClick={()=>setTemplatePanelOpen(false)} style={{padding:'3px',background:'none',border:'none',cursor:'pointer',color:'#94A3B8',display:'flex'}}><XIcon size={14}/></button>
          </div>
          <div style={{display:'flex',gap:'10px',overflowX:'auto',paddingBottom:'4px'}}>
            {TEMPLATES.map((tpl, idx) => {
              const previewEls = tpl.generate(W, H, settings);
              const PW = 100, PH = Math.round(PW * (H / W));
              const PS = PW / W;
              const isCurrent = idx === currentTemplateIdx;
              return (
                <button key={tpl.id} onClick={() => applyTemplate(tpl, idx)}
                  style={{flexShrink:0,width:`${PW + 16}px`,padding:'8px',border:`2px solid ${isCurrent?'#7C3AED':'rgba(255,255,255,0.1)'}`,borderRadius:'10px',cursor:'pointer',backgroundColor:isCurrent?'#2D1B69':'rgba(255,255,255,0.05)',transition:'all 0.15s',textAlign:'center'}}>
                  {/* Mini preview */}
                  <div style={{position:'relative',width:`${PW}px`,height:`${PH}px`,backgroundColor:'#fff',borderRadius:'4px',overflow:'hidden',margin:'0 auto 6px'}}>
                    {previewEls.map((el, i) => {
                      const px = el.x*PS, py = el.y*PS, pw = (el.width||0)*PS, ph = (el.height||0)*PS;
                      if (el.type==='text') return (
                        <div key={i} style={{position:'absolute',left:px,top:py,width:pw,height:ph,backgroundColor:el.bg&&el.bg!=='transparent'?el.bg:'transparent',display:'flex',alignItems:'center',justifyContent:el.align==='center'?'center':el.align==='right'?'flex-end':'flex-start',overflow:'hidden',padding:'1px',boxSizing:'border-box'}}>
                          <span style={{fontSize:'3.5px',fontWeight:el.fontWeight,color:el.color,whiteSpace:'nowrap',overflow:'hidden'}}>{resolve(el.value)}</span>
                        </div>
                      );
                      if (el.type==='image') return (
                        <div key={i} style={{position:'absolute',left:px,top:py,width:pw,height:ph,backgroundColor:el.bg||'#F3F4F6',display:'flex',alignItems:'center',justifyContent:'center'}}>
                          <span style={{fontSize:'5px',color:'#94A3B8'}}>{el.imageType==='brand'?'🏷':'🖼'}</span>
                        </div>
                      );
                      if (el.type==='rect') return (
                        <div key={i} style={{position:'absolute',left:px,top:py,width:pw,height:ph,backgroundColor:el.fill&&el.fill!=='none'?el.fill:'transparent',border:el.stroke&&el.stroke!=='none'?`0.5px solid ${el.stroke}`:'none',boxSizing:'border-box'}}/>
                      );
                      if (el.type==='line') return (
                        <div key={i} style={{position:'absolute',left:px,top:py,width:pw,height:Math.max(ph,0.5),backgroundColor:el.fill||'#E2E8F0'}}/>
                      );
                      return null;
                    })}
                  </div>
                  <div style={{fontSize:'11px',fontWeight:700,color:isCurrent?'#C4B5FD':'#E2E8F0'}}>{tpl.name}</div>
                  <div style={{fontSize:'9px',color:isCurrent?'#A78BFA':'#94A3B8',marginTop:'1px'}}>{tpl.desc}</div>
                  {isCurrent && <div style={{fontSize:'9px',color:'#7C3AED',marginTop:'3px',backgroundColor:'#EDE9FE',borderRadius:'4px',padding:'1px 4px'}}>● Aktif</div>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Align Panel ── */}
      {alignPanelOpen && (
        <div style={{backgroundColor:'#F0F9FF',borderBottom:'1px solid #BAE6FD',padding:'10px 16px',flexShrink:0,display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap'}}>
          <span style={{fontSize:'11px',fontWeight:700,color:'#0369A1',marginRight:'4px'}}>⊟ Hizalama:</span>
          {[
            {id:'left',  label:'⬅ Sol',       title:'Tüm elemanları sol kenara hizala'},
            {id:'cx',    label:'↔ Yatay Orta', title:'Yatay olarak ortala'},
            {id:'right', label:'Sağ ➡',        title:'Sağ kenara hizala'},
            {id:'top',   label:'⬆ Üst',         title:'Üst kenara hizala'},
            {id:'cy',    label:'↕ Dikey Orta', title:'Dikey olarak ortala'},
            {id:'bottom',label:'Alt ⬇',         title:'Alt kenara hizala'},
          ].map(a => (
            <button key={a.id} onClick={() => alignEls(a.id)} title={a.title}
              style={{padding:'5px 10px',fontSize:'11px',fontWeight:600,border:'1px solid #BAE6FD',borderRadius:'7px',backgroundColor:'#fff',cursor:'pointer',color:'#0369A1',whiteSpace:'nowrap'}}>
              {a.label}
            </button>
          ))}
          <div style={{width:'1px',height:'24px',backgroundColor:'#BAE6FD',margin:'0 2px'}}/>
          <button onClick={() => alignEls('dist-y')} title="Dikey boşlukları eşitle"
            style={{padding:'5px 10px',fontSize:'11px',fontWeight:600,border:'1px solid #FED7AA',borderRadius:'7px',backgroundColor:'#FFF7ED',cursor:'pointer',color:'#C2410C',whiteSpace:'nowrap'}}>
            ⊟ Dikey Dağıt
          </button>
          <button onClick={() => alignEls('dist-x')} title="Yatay boşlukları eşitle"
            style={{padding:'5px 10px',fontSize:'11px',fontWeight:600,border:'1px solid #FED7AA',borderRadius:'7px',backgroundColor:'#FFF7ED',cursor:'pointer',color:'#C2410C',whiteSpace:'nowrap'}}>
            ⊞ Yatay Dağıt
          </button>
          <button onClick={() => alignEls('auto')} title="Tüm elemanları dikey olarak eşit aralıklarla sırala, tam genişliğe ayarla"
            style={{padding:'5px 12px',fontSize:'11px',fontWeight:700,border:'none',borderRadius:'7px',backgroundColor:'#0369A1',cursor:'pointer',color:'#fff',whiteSpace:'nowrap'}}>
            ✨ Otomatik Hizala
          </button>
          <button onClick={()=>setAlignPanelOpen(false)} style={{marginLeft:'auto',padding:'4px',background:'none',border:'none',cursor:'pointer',color:'#94A3B8',display:'flex'}}><XIcon size={13}/></button>
        </div>
      )}

      {/* Main */}
      <div style={{flex:1,display:'flex',overflow:'hidden'}}>

        {/* Canvas area with Ctrl+Scroll zoom */}
        <div ref={scrollRef} style={{flex:1,overflow:'auto',display:'flex',alignItems:'center',justifyContent:'center',padding:'24px',backgroundColor:'#CBD5E1',userSelect:'none'}}
          onClick={e=>{if(e.target===scrollRef.current)setSelectedId(null);}}>
          {/* Outer wrapper sizes to the zoomed canvas for proper scrolling */}
          <div style={{position:'relative',width:`${CW*zoom}px`,height:`${CH*zoom}px`,flexShrink:0,boxShadow:'0 8px 40px rgba(0,0,0,0.2)'}}>
            {/* Canvas content (scaled) */}
            <div ref={canvasRef} style={{
              position:'absolute',top:0,left:0,
              width:`${CW}px`,height:`${CH}px`,
              transform:`scale(${zoom})`,transformOrigin:'top left',
              backgroundColor:format.background||'#fff',
              overflow:'hidden',
              backgroundImage:showGrid?'radial-gradient(circle,#C4C9D4 1px,transparent 1px)':'none',
              backgroundSize:showGrid?`${SCALE}px ${SCALE}px`:'none',
              cursor:tool==='pencil'?'crosshair':tool!=='select'?'cell':'default',
            }} onClick={e=>{if(e.target===canvasRef.current)setSelectedId(null);}}>

              {/* 1. Text & Image divs */}
              {elements.filter(el=>el.type==='text'||el.type==='image').map(el=>{
                const isSel=el.id===selectedId;
                const rv = el.type==='text'
                  ? (resolve(el.value) || (el.fieldId ? (DEMO.custom_fields?.[el.fieldId] || '') : ''))
                  : '';
                const mr = el.type==='text' ? (el.colorRules||[]).find(r=>r.value&&rv.trim().toLowerCase()===r.value.trim().toLowerCase()) : null;
                const isQualityEl = el.isQualityBar || el.value?.includes('{{quality}}');
                const qualBg = isQualityEl ? getQualityColor(rv).bg : (el.bg || 'transparent');
                const elBg = mr ? (mr.bgColor || qualBg) : qualBg;
                return (
                  <div key={el.id} style={{position:'absolute',left:`${el.x*SCALE}px`,top:`${el.y*SCALE}px`,width:`${el.width*SCALE}px`,height:`${el.height*SCALE}px`,cursor:tool==='select'?'move':'default',boxSizing:'border-box',outline:isSel?'2px solid #3B82F6':'1px dashed rgba(148,163,184,0.4)',overflow:'hidden',backgroundColor:elBg,zIndex:isSel?100:2}}
                    onMouseDown={e=>{if(tool!=='select')return;setSelectedId(el.id);startDrag(e,el);}}>
                    {el.type==='text'&&<span style={{display:'flex',alignItems:'center',justifyContent:el.align==='center'?'center':el.align==='right'?'flex-end':'flex-start',width:'100%',height:'100%',fontSize:`${el.fontSize*SCALE/3.78}px`,fontWeight:el.fontWeight||'400',fontStyle:el.italic?'italic':'normal',color:mr?(mr.textColor||getQualityColor(rv).text):(isQualityEl?getQualityColor(rv).text:(el.color||'#000')),padding:`${(el.padding||0.5)*SCALE}px`,boxSizing:'border-box',lineHeight:1.2,overflow:'hidden',writingMode:el.vertical?'vertical-rl':'horizontal-tb',transform:el.vertical?'rotate(180deg)':'none',textAlign:el.align||'left',fontFamily:el.fontFamily||settings.label_font_family||"'Inter','Arial',sans-serif"}}>{rv}</span>}
                    {el.type==='image'&&<div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:'3px',backgroundColor:el.bg||'#F3F4F6',fontSize:`${7*SCALE/3.78}px`,color:'#64748B',fontWeight:600}}>
                      {el.imageType==='brand'?<><Tag size={SCALE*1.5} color='#94A3B8'/><span>MARKA</span></>:<><Image size={SCALE*1.5} color='#94A3B8'/><span>ÜRÜN</span></>}
                    </div>}
                    {isSel&&resHP.map(({c,t,l})=>(
                      <div key={c} onMouseDown={e=>{e.stopPropagation();startResize(e,el,c);}} style={{position:'absolute',top:t,left:l,width:'8px',height:'8px',backgroundColor:'#fff',border:'1.5px solid #3B82F6',borderRadius:'2px',cursor:`${c}-resize`,zIndex:200}}/>
                    ))}
                  </div>
                );
              })}

              {/* 2. SVG – shapes (visual only, no pointer events) + line drawing */}
              <svg ref={svgRef} style={{position:'absolute',top:0,left:0,width:`${CW}px`,height:`${CH}px`,overflow:'visible',zIndex:3,pointerEvents:tool==='pencil'?'auto':'none',cursor:tool==='pencil'?'crosshair':'default'}}
                onMouseDown={handleSvgMouseDown} onMouseMove={handleSvgMouseMove} onMouseUp={handleSvgMouseUp} onMouseLeave={handleSvgMouseUp}>
                {/* Shapes */}
                {elements.filter(el=>SVG_SHAPES.includes(el.type)).map(el=>{
                  const sw=(el.strokeWidth||0.5)*SCALE, fill=!el.fill||el.fill==='none'?'none':el.fill, stroke=el.stroke||'#374151';
                  const base={stroke,strokeWidth:sw,fill,strokeLinecap:'round',strokeLinejoin:'round',pointerEvents:'none'};
                  if(el.type==='rect') return <rect key={el.id} {...base} x={el.x*SCALE} y={el.y*SCALE} width={el.width*SCALE} height={el.height*SCALE} rx={el.radius?el.radius*SCALE/3.78:0}/>;
                  if(el.type==='circle') return <ellipse key={el.id} {...base} cx={(el.x+el.width/2)*SCALE} cy={(el.y+el.height/2)*SCALE} rx={el.width/2*SCALE} ry={el.height/2*SCALE}/>;
                  if(el.type==='triangle'){const px=el.x*SCALE,py=el.y*SCALE,pw=el.width*SCALE,ph=el.height*SCALE;return <polygon key={el.id} {...base} points={`${px+pw/2},${py} ${px+pw},${py+ph} ${px},${py+ph}`}/>;}
                  if(el.type==='line') return <line key={el.id} x1={el.x*SCALE} y1={el.y*SCALE} x2={(el.x+el.width)*SCALE} y2={(el.y+el.height)*SCALE} stroke={el.fill||stroke} strokeWidth={(el.strokeWidth||0.3)*SCALE} strokeLinecap="round" pointerEvents="none"/>;
                  if(el.type==='path') return <polyline key={el.id} {...base} points={(el.points||[]).map(([x,y])=>`${x*SCALE},${y*SCALE}`).join(' ')}/>;
                  return null;
                })}

                {/* Drawing preview */}
                {tool==='pencil'&&lineStart&&lineEnd&&(
                  <line x1={lineStart[0]*SCALE} y1={lineStart[1]*SCALE} x2={lineEnd[0]*SCALE} y2={lineEnd[1]*SCALE}
                    stroke={snapInfo?.type==='point'?'#22C55E':snapInfo?.type==='angle'?'#3B82F6':pencilColor}
                    strokeWidth={pencilWidth*SCALE} strokeLinecap="round"
                    strokeDasharray={snapInfo?'none':'5,3'} pointerEvents="none"/>
                )}
                {/* Snap indicator */}
                {snapInfo?.type==='point'&&lineEnd&&(
                  <circle cx={lineEnd[0]*SCALE} cy={lineEnd[1]*SCALE} r="6" fill="none" stroke="#22C55E" strokeWidth="2" pointerEvents="none"/>
                )}
                {snapInfo?.type==='angle'&&lineEnd&&(
                  <rect x={lineEnd[0]*SCALE-5} y={lineEnd[1]*SCALE-5} width="10" height="10" fill="none" stroke="#3B82F6" strokeWidth="2" pointerEvents="none"/>
                )}
                {/* Start point indicator while drawing */}
                {lineStart&&(
                  <circle cx={lineStart[0]*SCALE} cy={lineStart[1]*SCALE} r="4" fill={pencilColor} stroke="white" strokeWidth="1.5" pointerEvents="none"/>
                )}
              </svg>

              {/* 3. Snap guides */}
              {snapGuides.map((g, i) => (
                g.axis === 'x'
                  ? <div key={`sg_${i}`} style={{ position:'absolute', left:`${g.pos*SCALE}px`, top:0, width:'1px', height:`${CH}px`, backgroundColor:'rgba(59,130,246,0.8)', zIndex:200, pointerEvents:'none', boxShadow:'0 0 4px rgba(59,130,246,0.4)' }} />
                  : <div key={`sg_${i}`} style={{ position:'absolute', left:0, top:`${g.pos*SCALE}px`, width:`${CW}px`, height:'1px', backgroundColor:'rgba(59,130,246,0.8)', zIndex:200, pointerEvents:'none', boxShadow:'0 0 4px rgba(59,130,246,0.4)' }} />
              ))}

              {/* 4. Hit areas for SVG shapes */}
              {elements.filter(el=>SVG_SHAPES.includes(el.type)).map(el=>{
                const isSel=el.id===selectedId;
                // For path/line elements, ensure minimum hit area size (12px minimum)
                const MIN_HIT = 12;
                const hitW = Math.max(el.width*SCALE, MIN_HIT);
                const hitH = Math.max(el.height*SCALE, MIN_HIT);
                // Center the hit area over the element
                const offsetX = (hitW - el.width*SCALE) / 2;
                const offsetY = (hitH - el.height*SCALE) / 2;
                return (
                  <div key={`h_${el.id}`} style={{
                    position:'absolute',
                    left:`${el.x*SCALE - offsetX - 3}px`,
                    top:`${el.y*SCALE - offsetY - 3}px`,
                    width:`${hitW+6}px`,
                    height:`${hitH+6}px`,
                    cursor:tool==='select'?'move':'default',
                    zIndex:isSel?101:4,
                    pointerEvents:tool==='pencil'?'none':'auto',
                    outline:isSel?'2px solid #3B82F6':'none',
                    outlineOffset:'1px'
                  }}
                    onMouseDown={e=>{if(tool!=='select')return;e.stopPropagation();setSelectedId(el.id);startDrag(e,el);}}>
                    {isSel&&resHP.map(({c,t,l})=>(
                      <div key={c} onMouseDown={e=>{e.stopPropagation();startResize(e,el,c);}} style={{position:'absolute',top:t,left:l,width:'8px',height:'8px',backgroundColor:'#fff',border:'1.5px solid #3B82F6',borderRadius:'2px',cursor:`${c}-resize`,zIndex:200}}/>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Properties panel */}
        <div style={{width:'225px',minWidth:'225px',backgroundColor:'#fff',borderLeft:'1px solid #E2E8F0',overflowY:'auto',flexShrink:0}}>
          <div style={{padding:'11px 14px',borderBottom:'1px solid #E2E8F0',backgroundColor:'#F8FAFC'}}>
            <p style={{fontSize:'11px',fontWeight:700,color:'#374151',textTransform:'uppercase',letterSpacing:'0.06em',margin:0}}>
              {selectedEl?`${selectedEl.type==='path'?'ÇİZGİ':selectedEl.type.toUpperCase()} Özellikleri`:'Eleman Seç'}
            </p>
          </div>

          {!selectedEl?(
            <div style={{padding:'14px',fontSize:'11px',color:'#94A3B8',lineHeight:1.8}}>
              <p style={{fontWeight:600,color:'#374151',marginBottom:'6px'}}>Kısayollar:</p>
              <p>Del = sil &nbsp; Ctrl+Z = geri al</p>
              <p>Ctrl+D = kopyala</p>
              <p>Ctrl+Scroll = zoom</p>
              <p style={{marginTop:'8px',fontWeight:600,color:'#374151'}}>Düz Çizgi Mıknatıs:</p>
              <p>🔵 Yatay/Dikey açı snap (±12°)</p>
              <p style={{marginTop:'8px',fontWeight:600,color:'#374151'}}>Değişkenler:</p>
              {VARS.map(v=><p key={v.val} style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:'10px',color:'#0B4F8A'}}>{v.val}</p>)}

              {/* ── Kategori Alanları ── */}
              {categories.length > 0 && (
                <div style={{marginTop:'12px'}}>
                  <p style={{fontWeight:600,color:'#374151',marginBottom:'6px'}}>Kategori Alanları:</p>
                  <p style={{fontSize:'10px',color:'#94A3B8',marginBottom:'8px',lineHeight:1.5}}>Tıkla → canvas'a metin kutusu olarak ekle</p>
                  {categories.map(cat=>(
                    <div key={cat.id} style={{marginBottom:'6px',border:'1px solid #E2E8F0',borderRadius:'7px',overflow:'hidden'}}>
                      <button
                        onClick={()=>setExpandedCat(expandedCat===cat.id?null:cat.id)}
                        style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'6px 9px',background:'#F8FAFC',border:'none',cursor:'pointer',fontSize:'11px',fontWeight:700,color:'#0F172A'}}
                      >
                        <span>📁 {cat.name}</span>
                        <span style={{fontSize:'9px',color:'#94A3B8'}}>{cat.fields?.length||0} alan</span>
                      </button>
                      {expandedCat===cat.id&&(cat.fields||[]).map(field=>(
                        <button
                          key={field.id}
                          onClick={()=>addFieldElement(field)}
                          title={`Canvas'a ekle: ${field.var||field.name}`}
                          style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'5px 9px 5px 16px',background:'#fff',border:'none',borderTop:'1px solid #F1F5F9',cursor:'pointer',fontSize:'11px',color:'#374151',textAlign:'left'}}
                          onMouseEnter={e=>{e.currentTarget.style.backgroundColor='#EFF6FF';e.currentTarget.style.color='#0B4F8A';}}
                          onMouseLeave={e=>{e.currentTarget.style.backgroundColor='#fff';e.currentTarget.style.color='#374151';}}
                        >
                          <span>+ {field.name}</span>
                          {field.colorRules?.length>0&&<span style={{fontSize:'9px',backgroundColor:'#EDE9FE',color:'#7C3AED',padding:'1px 5px',borderRadius:'10px'}}>{field.colorRules.length}🎨</span>}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ):(
            <div style={{padding:'12px 14px',display:'flex',flexDirection:'column',gap:'11px'}}>
              <div>
                <p style={{fontSize:'11px',fontWeight:700,color:'#374151',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:'7px'}}>Konum & Boyut</p>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'7px'}}>
                  {numInp('X','x')}{numInp('Y','y')}
                  {selectedEl.type!=='path'&&<>{numInp('Genişlik','width',0.5)}{numInp('Yükseklik','height',0.2)}</>}
                </div>
              </div>

              {selectedEl.type==='text'&&(<>
                {selectedEl.fieldName&&(
                  <div style={{padding:'6px 10px',backgroundColor:'#EDE9FE',borderRadius:'6px',fontSize:'11px',color:'#7C3AED',fontWeight:600}}>
                    🏷 Kategori alanı: {selectedEl.fieldName}
                    {selectedEl.colorRules?.length>0&&<span style={{marginLeft:'6px',fontWeight:400}}>({selectedEl.colorRules.length} renk kuralı)</span>}
                  </div>
                )}
                <div>
                  <p style={{fontSize:'11px',fontWeight:700,color:'#374151',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:'6px'}}>Metin</p>
                  <textarea value={selectedEl.value||''} onChange={e=>updateElement(selectedId,{value:e.target.value})} onBlur={commitUpdate} rows={3} style={{width:'100%',boxSizing:'border-box',padding:'6px 8px',fontSize:'12px',border:'1px solid #E2E8F0',borderRadius:'6px',outline:'none',resize:'vertical'}}/>
                  <div style={{marginTop:'5px',display:'flex',gap:'3px',flexWrap:'wrap'}}>
                    {VARS.map(v=>(
                      <button key={v.val} onClick={()=>{updateElement(selectedId,{value:(selectedEl.value||'')+v.val});commitUpdate();}} style={{padding:'2px 5px',fontSize:'9px',fontFamily:"'IBM Plex Mono',monospace",border:'1px solid #BFDBFE',borderRadius:'4px',backgroundColor:'#EFF6FF',cursor:'pointer',color:'#1D4ED8'}}>{v.val}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <p style={{fontSize:'11px',fontWeight:700,color:'#374151',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:'6px'}}>Yazı Tipi</p>
                  <div style={{marginBottom:'7px'}}>
                    <label style={{display:'block',fontSize:'10px',color:'#64748B',marginBottom:'2px'}}>Yazı Tipi Ailesi</label>
                    <select value={selectedEl.fontFamily||''} onChange={e=>{updateElement(selectedId,{fontFamily:e.target.value});commitUpdate();}}
                      style={{width:'100%',padding:'5px 6px',fontSize:'12px',border:'1px solid #E2E8F0',borderRadius:'6px',outline:'none',
                        fontFamily:selectedEl.fontFamily||settings.label_font_family||"'Inter','Arial',sans-serif"}}>
                      <option value="">{`Genel (${FONT_OPTIONS.find(f=>f.value===settings.label_font_family)?.label||'Inter'})`}</option>
                      {FONT_OPTIONS.map(f=><option key={f.value} value={f.value} style={{fontFamily:f.value}}>{f.label}</option>)}
                    </select>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'7px',marginBottom:'7px'}}>
                    {numInp('Boyut (pt)','fontSize',4,72,0.5)}
                    <div><label style={{display:'block',fontSize:'10px',color:'#64748B',marginBottom:'2px'}}>Kalınlık</label>
                      <select value={selectedEl.fontWeight||'400'} onChange={e=>{updateElement(selectedId,{fontWeight:e.target.value});commitUpdate();}} style={{width:'100%',padding:'5px 6px',fontSize:'12px',border:'1px solid #E2E8F0',borderRadius:'6px',outline:'none'}}>
                        <option value="300">İnce</option><option value="400">Normal</option><option value="600">Kalın</option><option value="700">Çok Kalın</option><option value="800">Ekstra</option>
                      </select></div>
                  </div>
                  <div style={{display:'flex',gap:'5px',marginBottom:'7px'}}>
                    {[['left','⬅'],['center','☰'],['right','➡']].map(([v,l])=>(
                      <button key={v} onClick={()=>{updateElement(selectedId,{align:v});commitUpdate();}} style={{flex:1,padding:'5px',border:`1.5px solid ${selectedEl.align===v?'#0B4F8A':'#E2E8F0'}`,borderRadius:'6px',backgroundColor:selectedEl.align===v?'#EFF6FF':'#fff',cursor:'pointer',fontSize:'13px'}}>{l}</button>
                    ))}
                  </div>
                  <div style={{display:'flex',gap:'5px',flexWrap:'wrap'}}>
                    <button onClick={()=>{updateElement(selectedId,{italic:!selectedEl.italic});commitUpdate();}} style={{padding:'4px 9px',border:`1.5px solid ${selectedEl.italic?'#0B4F8A':'#E2E8F0'}`,borderRadius:'6px',backgroundColor:selectedEl.italic?'#EFF6FF':'#fff',cursor:'pointer',fontSize:'12px',fontStyle:'italic',fontWeight:700}}>I</button>
                    <button onClick={()=>{updateElement(selectedId,{vertical:!selectedEl.vertical});commitUpdate();}} style={{padding:'4px 9px',border:`1.5px solid ${selectedEl.vertical?'#0B4F8A':'#E2E8F0'}`,borderRadius:'6px',backgroundColor:selectedEl.vertical?'#EFF6FF':'#fff',cursor:'pointer',fontSize:'10px'}}>↕ Dikey</button>
                    <button onClick={()=>{updateElement(selectedId,{isQualityBar:!selectedEl.isQualityBar});commitUpdate();}} style={{padding:'4px 9px',border:`1.5px solid ${selectedEl.isQualityBar?'#0B4F8A':'#E2E8F0'}`,borderRadius:'6px',backgroundColor:selectedEl.isQualityBar?'#EFF6FF':'#fff',cursor:'pointer',fontSize:'10px'}}>🎨 Kalite</button>
                  </div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'7px'}}>
                  <div><label style={{display:'block',fontSize:'10px',color:'#64748B',marginBottom:'2px'}}>Metin Rengi</label><input type="color" value={selectedEl.color||'#000'} onChange={e=>updateElement(selectedId,{color:e.target.value})} onBlur={commitUpdate} style={{width:'100%',height:'30px',padding:'2px',border:'1px solid #E2E8F0',borderRadius:'6px',cursor:'pointer'}}/></div>
                  <div><label style={{display:'block',fontSize:'10px',color:'#64748B',marginBottom:'2px'}}>Arka Plan</label><input type="color" value={selectedEl.bg&&selectedEl.bg!=='transparent'?selectedEl.bg:'#ffffff'} onChange={e=>updateElement(selectedId,{bg:e.target.value})} onBlur={commitUpdate} style={{width:'100%',height:'30px',padding:'2px',border:'1px solid #E2E8F0',borderRadius:'6px',cursor:'pointer'}}/></div>
                </div>
              </>)}

              {['rect','circle','triangle'].includes(selectedEl.type)&&(
                <div>
                  <p style={{fontSize:'11px',fontWeight:700,color:'#374151',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:'7px'}}>Şekil</p>
                  <div style={{display:'flex',gap:'5px',marginBottom:'9px'}}>
                    <button onClick={()=>{updateElement(selectedId,{fill:'none'});commitUpdate();}} style={{flex:1,padding:'5px',fontSize:'11px',fontWeight:600,border:`1.5px solid ${!selectedEl.fill||selectedEl.fill==='none'?'#0B4F8A':'#E2E8F0'}`,borderRadius:'6px',backgroundColor:!selectedEl.fill||selectedEl.fill==='none'?'#EFF6FF':'#fff',cursor:'pointer'}}>☐ Boş</button>
                    <button onClick={()=>{updateElement(selectedId,{fill:selectedEl.fill&&selectedEl.fill!=='none'?selectedEl.fill:'#E5E7EB'});commitUpdate();}} style={{flex:1,padding:'5px',fontSize:'11px',fontWeight:600,border:`1.5px solid ${selectedEl.fill&&selectedEl.fill!=='none'?'#0B4F8A':'#E2E8F0'}`,borderRadius:'6px',backgroundColor:selectedEl.fill&&selectedEl.fill!=='none'?'#EFF6FF':'#fff',cursor:'pointer'}}>■ Dolu</button>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'7px',marginBottom:'7px'}}>
                    {selectedEl.fill&&selectedEl.fill!=='none'&&<div><label style={{display:'block',fontSize:'10px',color:'#64748B',marginBottom:'2px'}}>Dolgu</label><input type="color" value={selectedEl.fill||'#E5E7EB'} onChange={e=>updateElement(selectedId,{fill:e.target.value})} onBlur={commitUpdate} style={{width:'100%',height:'30px',padding:'2px',border:'1px solid #E2E8F0',borderRadius:'6px',cursor:'pointer'}}/></div>}
                    <div><label style={{display:'block',fontSize:'10px',color:'#64748B',marginBottom:'2px'}}>Kenarlık</label><input type="color" value={selectedEl.stroke||'#374151'} onChange={e=>updateElement(selectedId,{stroke:e.target.value})} onBlur={commitUpdate} style={{width:'100%',height:'30px',padding:'2px',border:'1px solid #E2E8F0',borderRadius:'6px',cursor:'pointer'}}/></div>
                  </div>
                  {numInp('Kenarlık Kalınlığı (mm)','strokeWidth',0,5,0.1)}
                  {selectedEl.type==='rect'&&numInp('Köşe Yuvarlama (mm)','radius',0,20,0.5)}
                </div>
              )}

              {(selectedEl.type==='path'||selectedEl.type==='line')&&(
                <div>
                  <p style={{fontSize:'11px',fontWeight:700,color:'#374151',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:'7px'}}>Çizgi</p>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'7px'}}>
                    <div><label style={{display:'block',fontSize:'10px',color:'#64748B',marginBottom:'2px'}}>Renk</label><input type="color" value={selectedEl.stroke||selectedEl.fill||'#374151'} onChange={e=>updateElement(selectedId,selectedEl.type==='path'?{stroke:e.target.value}:{fill:e.target.value})} onBlur={commitUpdate} style={{width:'100%',height:'30px',padding:'2px',border:'1px solid #E2E8F0',borderRadius:'6px',cursor:'pointer'}}/></div>
                    {numInp('Kalınlık (mm)','strokeWidth',0.1,10,0.1)}
                  </div>
                </div>
              )}

              {selectedEl.type==='image'&&(
                <div>
                  <p style={{fontSize:'11px',fontWeight:700,color:'#374151',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:'7px'}}>Resim Tipi</p>
                  {['product','brand'].map(t=>(
                    <label key={t} style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'6px',cursor:'pointer'}}>
                      <input type="radio" name="imgT" value={t} checked={selectedEl.imageType===t} onChange={()=>{updateElement(selectedId,{imageType:t});commitUpdate();}}/>
                      <span style={{fontSize:'12px'}}>{t==='product'?'🖼 Ürün Resmi':'🏷 Marka Logo'}</span>
                    </label>
                  ))}
                </div>
              )}

              <button onClick={deleteSelected} style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'5px',width:'100%',padding:'8px',fontSize:'12px',fontWeight:600,backgroundColor:'#FEF2F2',color:'#DC2626',border:'1px solid #FCA5A5',borderRadius:'8px',cursor:'pointer',marginTop:'4px'}}>
                <Trash2 size={12}/> Sil (Del)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Kataloğa Kaydet Modal ── */}
      {catalogModal && (
        <div style={{position:'fixed',inset:0,zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:'16px'}}>
          <div onClick={()=>setCatalogModal(false)} style={{position:'absolute',inset:0,backgroundColor:'rgba(0,0,0,0.55)'}}/>
          <div style={{position:'relative',backgroundColor:'#fff',borderRadius:'14px',padding:'24px',width:'100%',maxWidth:'420px',boxShadow:'0 20px 60px rgba(0,0,0,0.25)',zIndex:1}}>
            <h2 style={{fontSize:'18px',fontWeight:700,color:'#0F172A',margin:'0 0 6px',fontFamily:"'Space Grotesk','Inter',sans-serif"}}>Kataloğa Kaydet</h2>
            <p style={{fontSize:'13px',color:'#64748B',margin:'0 0 16px'}}>Bu tasarıma bir isim verin. Tasarım Kataloğu'nda saklanacak ve istediğiniz şablona atayabileceksiniz.</p>
            <label style={{display:'block',fontSize:'12px',fontWeight:600,color:'#374151',marginBottom:'6px'}}>Tasarım Adı *</label>
            <input
              value={catalogName} onChange={e=>setCatalogName(e.target.value)}
              onKeyDown={e=>{if(e.key==='Enter')handleSaveToCatalog();}}
              placeholder="örn: Civata Etiketi, Standart Ürün Şablonu..."
              autoFocus
              style={{width:'100%',boxSizing:'border-box',padding:'10px 12px',fontSize:'14px',border:'1px solid #E2E8F0',borderRadius:'8px',outline:'none',color:'#0F172A',fontFamily:"'Inter',sans-serif",marginBottom:'16px'}}
            />
            <div style={{padding:'10px 12px',backgroundColor:'#EFF6FF',border:'1px solid #BFDBFE',borderRadius:'8px',fontSize:'12px',color:'#1D4ED8',marginBottom:'20px'}}>
              <strong>Sonraki adım:</strong> Tasarım Kataloğu sayfasından bu tasarımı istediğiniz şablonlara atayabilirsiniz.
            </div>
            <div style={{display:'flex',gap:'10px'}}>
              <button onClick={()=>setCatalogModal(false)} style={{flex:1,padding:'10px',fontSize:'13px',border:'1px solid #E2E8F0',borderRadius:'8px',background:'#fff',cursor:'pointer'}}>İptal</button>
              <button onClick={handleSaveToCatalog} disabled={saving||!catalogName.trim()} style={{flex:2,padding:'10px',fontSize:'13px',fontWeight:700,backgroundColor:!catalogName.trim()||saving?'#94A3B8':'#0B4F8A',color:'#fff',border:'none',borderRadius:'8px',cursor:!catalogName.trim()||saving?'not-allowed':'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:'6px'}}>
                {saving?<><div style={{width:'13px',height:'13px',border:'2px solid #fff',borderTopColor:'transparent',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>Kaydediliyor...</>:<><Layers size={14}/>Kataloğa Kaydet</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
