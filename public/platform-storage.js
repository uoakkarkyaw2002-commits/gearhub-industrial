(function(root) {
  const units={MB:1024**2,GB:1024**3};
  const api={
    bytes(amount,unit,optional=false) {
      if(amount===''&&optional)return null;
      if(typeof amount!=='string'||!amount.trim()||!units[unit])throw Error('Enter a storage limit in MB or GB.');
      const n=Number(amount)*units[unit];
      if(!Number.isFinite(n)||n<0||n>10*units.GB)throw Error('Storage limit must be between 0 and 10 GB.');
      return Math.round(n);
    },
    display(bytes) {
      if(bytes===null||bytes===undefined)return {amount:'',unit:'MB'};
      const unit=bytes>=units.GB?'GB':'MB';
      return {amount:bytes/units[unit],unit};
    },
    label(bytes) {
      const {amount,unit}=api.display(bytes);
      return Number(amount).toLocaleString('en-US',{maximumFractionDigits:3})+' '+unit;
    }
  };
  if(typeof module==='object')module.exports=api;
  else root.GearHubStorage=api;
})(typeof window==='object'?window:globalThis);
