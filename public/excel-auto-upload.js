// Excel auto upload from the shop's own Windows PC. The shop owner downloads one .bat file (it
// carries the shop's secret upload key). Double-clicking it once:
//  - asks which Excel file to send,
//  - saves a small watcher in %LOCALAPPDATA%\SkyShopExcelUpload,
//  - starts it now and every time the PC starts (Startup folder, no admin rights needed).
// The watcher checks the file every minute and uploads it after each save, even while Excel has
// it open. Nothing is installed from the internet; the whole program is inside the .bat file.
(()=>{
 const watcher=[
  "$dir=Split-Path -Parent $MyInvocation.MyCommand.Path",
  "$cfg=Get-Content -Raw -Path (Join-Path $dir 'config.json') | ConvertFrom-Json",
  "$log=Join-Path $dir 'upload.log'",
  "function Log($text){ Add-Content -Path $log -Value ((Get-Date -Format s)+' '+$text); if((Get-Item $log).Length -gt 200KB){ Remove-Item $log } }",
  "[Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12",
  "Add-Type -AssemblyName System.Net.Http",
  "$stateFile=Join-Path $dir 'last.txt'",
  "$sent=''; if(Test-Path $stateFile){ $sent=(Get-Content -Raw $stateFile).Trim() }",
  "while($true){",
  " try{",
  "  $f=Get-Item -LiteralPath $cfg.file",
  "  $stamp=[string]$f.LastWriteTimeUtc.Ticks+'-'+$f.Length",
  "  if($stamp -ne $sent){",
  "   Start-Sleep -Seconds 10",
  "   $f=Get-Item -LiteralPath $cfg.file",
  "   if(([string]$f.LastWriteTimeUtc.Ticks+'-'+$f.Length) -eq $stamp){",
  "    $in=[IO.File]::Open($f.FullName,'Open','Read','ReadWrite')",
  "    try{ $copy=New-Object IO.MemoryStream; $in.CopyTo($copy); $bytes=$copy.ToArray() } finally { $in.Close() }",
  "    $client=New-Object Net.Http.HttpClient",
  "    $client.Timeout=[TimeSpan]::FromMinutes(5)",
  "    $client.DefaultRequestHeaders.Add('X-Upload-Key',$cfg.key)",
  "    $client.DefaultRequestHeaders.Add('Origin',$cfg.origin)",
  "    $form=New-Object Net.Http.MultipartFormDataContent",
  "    $part=New-Object Net.Http.ByteArrayContent -ArgumentList (,$bytes)",
  "    $form.Add($part,'file',$f.Name)",
  "    $res=$client.PostAsync($cfg.origin+'/api/platform/spreadsheets/auto-upload',$form).Result",
  "    if($res.IsSuccessStatusCode){ $sent=$stamp; Set-Content -Path $stateFile -Value $stamp; Log ('Uploaded '+$f.Name) }",
  "    else { Log ('Upload failed '+[int]$res.StatusCode+' '+$res.Content.ReadAsStringAsync().Result) }",
  "    $client.Dispose()",
  "   }",
  "  }",
  " } catch { Log ('Error '+$_.Exception.Message) }",
  " Start-Sleep -Seconds 60",
  "}"
 ];
 const quote=text=>"'"+String(text).replace(/'/g,"''")+"'";
 function build({key,origin,shop}){
  const install=[
   "#PS-START",
   "$ErrorActionPreference='Stop'",
   "$Key="+quote(key)+"; $Origin="+quote(origin)+"; $Shop="+quote(shop),
   "Add-Type -AssemblyName System.Windows.Forms",
   "$pick=New-Object System.Windows.Forms.OpenFileDialog",
   "$pick.Title='Choose the Excel file to upload to '+$Shop",
   "$pick.Filter='Excel files (*.xlsx;*.xlsm;*.xls;*.csv)|*.xlsx;*.xlsm;*.xls;*.csv'",
   "if($pick.ShowDialog() -ne [System.Windows.Forms.DialogResult]::OK){ Write-Host 'No file chosen. Nothing was installed.'; exit 0 }",
   "$dir=Join-Path $env:LOCALAPPDATA 'SkyShopExcelUpload'",
   "New-Item -ItemType Directory -Force -Path $dir | Out-Null",
   "try{ Get-CimInstance Win32_Process -Filter \"Name='powershell.exe'\" | Where-Object { $_.CommandLine -like '*SkyShopExcelUpload*watch.ps1*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force } } catch {}",
   "Remove-Item -Path (Join-Path $dir 'last.txt') -ErrorAction SilentlyContinue",
   "@{file=$pick.FileName;key=$Key;origin=$Origin;shop=$Shop} | ConvertTo-Json | Set-Content -Path (Join-Path $dir 'config.json') -Encoding UTF8",
   "$watch=@'",
   ...watcher,
   "'@",
   "Set-Content -Path (Join-Path $dir 'watch.ps1') -Value $watch -Encoding UTF8",
   "$startup=[Environment]::GetFolderPath('Startup')",
   "$vbs=Join-Path $startup 'SkyShopExcelUpload.vbs'",
   "Set-Content -Path $vbs -Encoding ASCII -Value ('CreateObject(\"WScript.Shell\").Run \"powershell.exe -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File \"\"'+(Join-Path $dir 'watch.ps1')+'\"\"\", 0, False')",
   "Start-Process wscript.exe -ArgumentList ('\"'+$vbs+'\"')",
   "[System.Windows.Forms.MessageBox]::Show('Done. '+[IO.Path]::GetFileName($pick.FileName)+' now uploads to '+$Shop+' a minute after every save. It starts by itself when this PC starts.','SkyShop Excel auto upload') | Out-Null"
  ];
  const bat=[
   "@echo off",
   "title SkyShop Excel auto upload",
   "powershell -NoProfile -ExecutionPolicy Bypass -Command \"$t=[IO.File]::ReadAllText('%~f0');iex $t.Substring($t.IndexOf('#'+'PS-START'))\"",
   "if errorlevel 1 pause",
   "exit /b",
   ...install
  ];
  return bat.join('\r\n')+'\r\n';
 }
 // macOS uses its own file picker, curl and a per-user LaunchAgent; no extra runtime.
 const macWatcher=String.raw`#!/bin/bash
set -u
umask 077
dir=$(cd "$(dirname "$0")" && pwd)
file=$(cat "$dir/file")
key=$(cat "$dir/key")
origin=$(cat "$dir/origin")
sent=$(cat "$dir/last.txt" 2>/dev/null || true)
copy=''
tempdir=''
trap 'if [ -n "$copy" ]; then rm -f "$copy"; fi; if [ -n "$tempdir" ]; then rmdir "$tempdir" 2>/dev/null || true; fi' EXIT
trap 'exit 0' TERM INT
while true; do
 stamp=$(stat -f '%m:%z' "$file" 2>/dev/null || true)
 if [ -n "$stamp" ] && [ "$stamp" != "$sent" ]; then
  sleep 10
  stable=$(stat -f '%m:%z' "$file" 2>/dev/null || true)
  if [ "$stamp" = "$stable" ]; then
   tempdir=$(mktemp -d "$dir/upload.XXXXXX") || { sleep 60; continue; }
   copy="$tempdir/$(basename "$file")"
   if cp "$file" "$copy"; then
    form_file=$(printf '%s' "$copy" | sed 's/\\/\\\\/g; s/"/\\"/g')
    if curl --fail --silent --show-error --max-time 300 -H "X-Upload-Key: $key" -H "Origin: $origin" -F "file=@\"$form_file\"" "$origin/api/platform/spreadsheets/auto-upload" > /dev/null; then
     sent=$stamp
     printf '%s' "$sent" > "$dir/last.txt"
     printf '%s Uploaded %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$(basename "$file")"
    fi
   fi
   rm -f "$copy"; rmdir "$tempdir"; copy=''; tempdir=''
  fi
 fi
 sleep 60
done
`;
 const shellQuote=text=>"'"+String(text).replace(/'/g,"'\\''")+"'";
 const macSlug=slug=>String(slug||'shop').replace(/[^a-z0-9-]/gi,'-');
 function buildMac({key,origin,shop,slug}){
  const id=macSlug(slug);
  return String.raw`#!/bin/bash
set -e
umask 077
shop=${shellQuote(shop)}
key=${shellQuote(key)}
origin=${shellQuote(origin)}
file=$(/usr/bin/osascript -e 'POSIX path of (choose file with prompt "Choose the Excel file to auto upload")') || exit 0
case "$file" in *.xlsx|*.XLSX|*.xlsm|*.XLSM|*.xls|*.XLS|*.csv|*.CSV) ;; *) echo 'Choose an .xlsx, .xlsm, .xls or .csv file.'; exit 1 ;; esac
dir="$HOME/Library/Application Support/SkyShopExcelUpload-${id}"
mkdir -p "$dir" "$HOME/Library/LaunchAgents"
printf '%s' "$file" > "$dir/file"
printf '%s' "$key" > "$dir/key"
printf '%s' "$origin" > "$dir/origin"
rm -f "$dir/last.txt"
cat > "$dir/watch.sh" <<'SKYSHOP_WATCHER'
${macWatcher}SKYSHOP_WATCHER
chmod 700 "$dir/watch.sh"
xml_dir=$(printf '%s' "$dir" | /usr/bin/sed 's/&/\&amp;/g; s/</\&lt;/g; s/>/\&gt;/g')
plist="$HOME/Library/LaunchAgents/com.skyshop.excel-upload.${id}.plist"
cat > "$plist" <<SKYSHOP_AGENT
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>Label</key><string>com.skyshop.excel-upload.${id}</string>
<key>ProgramArguments</key><array><string>/bin/bash</string><string>$xml_dir/watch.sh</string></array>
<key>RunAtLoad</key><true/><key>KeepAlive</key><true/>
<key>StandardOutPath</key><string>$xml_dir/upload.log</string>
<key>StandardErrorPath</key><string>$xml_dir/upload.log</string>
</dict></plist>
SKYSHOP_AGENT
/bin/launchctl bootout "gui/$(id -u)/com.skyshop.excel-upload.${id}" >/dev/null 2>&1 || true
/bin/launchctl bootstrap "gui/$(id -u)" "$plist"
/usr/bin/osascript - "$shop" <<'SKYSHOP_DONE'
on run argv
 display dialog ("Done. Your Excel file now uploads to " & item 1 of argv & " after every save and starts when you log in.") buttons {"OK"} default button "OK" with title "SkyShop Excel auto upload"
end run
SKYSHOP_DONE
`;
 }
 // Store a single executable .command in a ZIP so macOS preserves its execute bit.
 function macArchive(options){
  const encoder=new TextEncoder(),name=encoder.encode('SkyShop-Excel-AutoUpload-'+macSlug(options.slug)+'.command'),body=encoder.encode(buildMac(options));
  let crc=0xffffffff;for(const byte of body){crc^=byte;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}crc=(crc^0xffffffff)>>>0;
  const local=new Uint8Array(30+name.length+body.length),l=new DataView(local.buffer);
  l.setUint32(0,0x04034b50,true);l.setUint16(4,20,true);l.setUint16(6,0x800,true);l.setUint16(12,33,true);l.setUint32(14,crc,true);l.setUint32(18,body.length,true);l.setUint32(22,body.length,true);l.setUint16(26,name.length,true);local.set(name,30);local.set(body,30+name.length);
  const central=new Uint8Array(46+name.length),c=new DataView(central.buffer);
  c.setUint32(0,0x02014b50,true);c.setUint16(4,(3<<8)|20,true);c.setUint16(6,20,true);c.setUint16(8,0x800,true);c.setUint16(14,33,true);c.setUint32(16,crc,true);c.setUint32(20,body.length,true);c.setUint32(24,body.length,true);c.setUint16(28,name.length,true);c.setUint32(38,(0o100755<<16)>>>0,true);central.set(name,46);
  const end=new Uint8Array(22),e=new DataView(end.buffer);e.setUint32(0,0x06054b50,true);e.setUint16(8,1,true);e.setUint16(10,1,true);e.setUint32(12,central.length,true);e.setUint32(16,local.length,true);
  const zip=new Uint8Array(local.length+central.length+end.length);zip.set(local);zip.set(central,local.length);zip.set(end,local.length+central.length);return zip;
 }
 window.GearHubExcelAutoUpload={build,buildMac,macArchive};
})();
