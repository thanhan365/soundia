using System;
using System.Linq;
using System.Net.Http;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;

var http = new HttpClient();
http.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0");

// Download LRC
var lrcBytes = await http.GetByteArrayAsync("https://lyric.nct.vn/2026/03/03/c/w/Z/u/1772512725317.lrc");
var lrcRaw = Encoding.UTF8.GetString(lrcBytes);
var hexClean = Regex.Replace(lrcRaw.Trim(), @"\s+", "");
Console.WriteLine($"Raw length: {lrcRaw.Length}, Hex clean: {hexClean.Length}, Is hex: {Regex.IsMatch(hexClean, @"^[0-9A-Fa-f]+$")}");

// Parse hex
var encBytes = Enumerable.Range(0, hexClean.Length / 2)
    .Select(i => Convert.ToByte(hexClean.Substring(i * 2, 2), 16)).ToArray();
int blockLen = (encBytes.Length / 16) * 16;
var aligned = encBytes.Take(blockLen).ToArray();
Console.WriteLine($"Enc bytes: {encBytes.Length}, Aligned: {aligned.Length}");

var decryptKey = "Lyr1cjust4nct";
var lrcRegex = new Regex(@"\[\d{2}:\d{2}\.\d{2,3}\]");

// Try different key preparations
var keys = new (string name, byte[] key)[] {
    ("raw-pad16", Encoding.UTF8.GetBytes(decryptKey.PadRight(16, '\0')).Take(16).ToArray()),
    ("md5", MD5.HashData(Encoding.UTF8.GetBytes(decryptKey))),
    ("sha256-16", SHA256.HashData(Encoding.UTF8.GetBytes(decryptKey)).Take(16).ToArray()),
    ("utf8-raw", Encoding.UTF8.GetBytes(decryptKey.PadRight(32, '\0')).Take(32).ToArray()),
};

foreach (var (kname, keyBytes) in keys)
{
    foreach (var mode in new[] { CipherMode.ECB, CipherMode.CBC })
    {
        foreach (var pad in new[] { PaddingMode.None, PaddingMode.PKCS7, PaddingMode.Zeros })
        {
            try
            {
                using var aes = Aes.Create();
                aes.Key = keyBytes.Length <= 16 ? keyBytes : keyBytes.Take(16).ToArray();
                aes.Mode = mode;
                aes.Padding = pad;
                if (mode == CipherMode.CBC)
                    aes.IV = aligned.Take(16).ToArray();
                
                using var dec = aes.CreateDecryptor();
                var input = mode == CipherMode.CBC ? aligned.Skip(16).ToArray() : aligned;
                var db = dec.TransformFinalBlock(input, 0, input.Length);
                var txt = Encoding.UTF8.GetString(db).TrimEnd('\0');
                var matches = lrcRegex.Matches(txt).Count;
                if (matches >= 2)
                {
                    Console.WriteLine($"SUCCESS! key={kname} mode={mode} pad={pad} matches={matches}");
                    Console.WriteLine(txt.Substring(0, Math.Min(300, txt.Length)));
                    return;
                }
            }
            catch { }
        }
    }
}
Console.WriteLine("All attempts failed");
