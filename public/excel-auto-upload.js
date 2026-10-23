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
 window.GearHubExcelAutoUpload={build};
})();
