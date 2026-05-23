import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

const DATA_FILE = path.join(process.cwd(), "server", "data.json");

export class MockDB {
  private users: any[] = [];
  private servers: any[] = [];
  private vpnUsers: any[] = [];

  constructor() {
    this.loadData();
    if (this.users.length === 0) {
        // Initialize default admin
        const adminHash = bcrypt.hashSync("admin", 10);
        this.users.push({
          id: "admin-1",
          username: "admin",
          passwordHash: adminHash,
          role: "admin",
        });
        this.saveData();
    }
  }

  private loadData() {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
        this.users = data.users || [];
        this.servers = data.servers || [];
        this.vpnUsers = data.vpnUsers || [];
      }
    } catch (err) {
      console.error("Failed to load data:", err);
    }
  }

  private saveData() {
    try {
      const data = {
        users: this.users,
        servers: this.servers,
        vpnUsers: this.vpnUsers,
      };
      // Ensures the directory exists
      if (!fs.existsSync(path.dirname(DATA_FILE))) {
          fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
      }
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
    } catch (err) {
      console.error("Failed to save data:", err);
    }
  }

  // --- Auth ---
  getUser(username: string, pass: string) {
    const user = this.users.find((u) => u.username === username);
    if (!user) return null;
    if (bcrypt.compareSync(pass, user.passwordHash)) {
      return user;
    }
    return null;
  }

  getUserById(id: string) {
    return this.users.find((u) => u.id === id);
  }

  updateUsername(userId: string, newUsername: string) {
    const existing = this.users.find((u) => u.username === newUsername && u.id !== userId);
    if (existing) throw new Error("اسم المستخدم مستخدم بالفعل");
    const user = this.users.find((u) => u.id === userId);
    if (!user) throw new Error("User not found");
    user.username = newUsername;
    this.saveData();
  }

  changePassword(userId: string, oldPass: string, newPass: string) {
    const user = this.users.find((u) => u.id === userId);
    if (!user) throw new Error("User not found");
    if (!bcrypt.compareSync(oldPass, user.passwordHash)) {
      throw new Error("Invalid old password");
    }
    user.passwordHash = bcrypt.hashSync(newPass, 10);
    this.saveData();
  }

  forceChangePassword(userId: string, newPass: string) {
    const user = this.users.find((u) => u.id === userId);
    if (!user) throw new Error("User not found");
    user.passwordHash = bcrypt.hashSync(newPass, 10);
    this.saveData();
  }

  // --- Clients (Resellers) ---
  addClient(data: { username: string, pass: string, serverId: string, limit: number, status: string }) {
    if (this.users.find((u) => u.username === data.username)) {
      throw new Error("اسم المستخدم مكرر");
    }

    const server = this.servers.find(s => s.id === data.serverId);
    if (!server) {
      throw new Error("السيرفر المختار غير موجود");
    }
    if (server.status !== 'نشط') {
      throw new Error("لا يمكن ربط الموزع بسيرفر غير نشط");
    }

    // Check if adding this limit exceeds the server limit
    const clientsOnServer = this.users.filter(u => u.role === "client" && u.serverId === data.serverId);
    const totalAllocatedLimit = clientsOnServer.reduce((sum, u) => sum + (u.limit || 0), 0);
    if (totalAllocatedLimit + data.limit > server.limit) {
      throw new Error(`لا يمكن تجاوز الحد الأقصى للسيرفر. المتبقي: ${server.limit - totalAllocatedLimit}`);
    }

    const client = {
      id: randomUUID(),
      username: data.username,
      passwordHash: bcrypt.hashSync(data.pass, 10),
      plainPass: data.pass,
      role: "client" as const,
      limit: data.limit,
      status: data.status,
      serverId: data.serverId,
      createdAt: new Date().toISOString()
    };
    this.users.push(client);
    this.saveData();
    
    return { id: client.id, username: client.username };
  }

  deleteClient(id: string) {
    if (id === "admin-1") throw new Error("Cannot delete super admin");
    this.users = this.users.filter((u) => u.id !== id);
    this.saveData();
  }

  getClients() {
    return this.users
      .filter((u) => u.role === "client")
      .map((u) => {
        const assignedServer = this.servers.find(s => s.id === u.serverId);
        return { 
          id: u.id, 
          username: u.username,
          plainPass: u.plainPass || '********',
          limit: u.limit,
          status: u.status,
          assignedServer: assignedServer ? assignedServer.name : "بدون سيرفر",
          createdAt: u.createdAt
        };
      });
  }

  // --- Servers ---
  addServer(data: { name: string, ip: string, port: number, username: string, passwordHash: string, panelUrl: string, type: string, inboundId: number, limit: number, status: string }) {
    if (!data.name || !data.ip || !data.port || !data.username || !data.passwordHash || !data.panelUrl || !data.type || !data.limit || !data.status) {
      throw new Error("جميع الحقول مطلوبة");
    }

    if (data.port < 1 || data.port > 65535) {
      throw new Error("Port غير صحيح");
    }

    if (this.servers.find(s => s.name === data.name)) {
      throw new Error("اسم السيرفر مكرر");
    }

    if (this.servers.find(s => s.ip === data.ip)) {
      throw new Error("IP مكرر");
    }

    const server = {
      id: randomUUID(),
      name: data.name,
      ip: data.ip,
      port: data.port,
      username: data.username,
      passwordHash: bcrypt.hashSync(data.passwordHash, 10), // Hash the password
      plainPass: data.passwordHash,
      panelUrl: data.panelUrl,
      type: data.type,
      inboundId: data.inboundId || 1,
      limit: data.limit,
      status: data.status,
      createdAt: new Date().toISOString(),
    };
    this.servers.push(server);
    this.saveData();
    
    return server;
  }

  deleteServer(id: string) {
    this.servers = this.servers.filter((s) => s.id !== id);
    this.vpnUsers = this.vpnUsers.filter((v) => v.serverId !== id);
    this.saveData();
  }
  
  updateServer(id: string, updates: any) {
    const srv = this.servers.find(s => s.id === id);
    if (!srv) throw new Error("Server not found");
    if (updates.name !== undefined) srv.name = updates.name;
    if (updates.ip !== undefined) srv.ip = updates.ip;
    if (updates.port !== undefined) srv.port = updates.port;
    if (updates.username !== undefined) srv.username = updates.username;
    if (updates.password !== undefined) srv.plainPass = updates.password; // Note password mapping to plainPass
    if (updates.panelUrl !== undefined) srv.panelUrl = updates.panelUrl;
    if (updates.type !== undefined) srv.type = updates.type;
    if (updates.inboundId !== undefined) srv.inboundId = updates.inboundId;
    if (updates.limit !== undefined) srv.limit = updates.limit;
    if (updates.status !== undefined) srv.status = updates.status;
    this.saveData();
    return srv;
  }

  getServers() {
    return this.servers.map((s) => {
      const clients = this.users.filter((u) => u.role === "client" && u.serverId === s.id);
      const serverUsers = this.vpnUsers.filter(v => v.serverId === s.id);
      return {
        ...s,
        clientName: clients.length > 0 ? clients.map(c => c.username).join(', ') : "None",
        userCount: serverUsers.length
      };
    });
  }



  // --- VPN Users logic ---
  async generateVpnUser(clientId: string) {
    const clientUser = this.users.find(u => u.id === clientId);
    if (!clientUser) throw new Error("المستخدم غير موجود");

    const serverId = clientUser.serverId;
    if (!serverId) {
      throw new Error("لا يوجد سيرفر مخصص لك حالياً.");
    }

    const selectedServer = this.servers.find(s => s.id === serverId);
    if (!selectedServer) {
      throw new Error("السيرفر المخصص غير موجود.");
    }

    const totalClientUsers = this.vpnUsers.filter(v => v.clientId === clientId).length;
    if (clientUser.limit && totalClientUsers >= clientUser.limit) {
      throw new Error("عذراً، لقد استنفدت الحد الأقصى للمستخدمين المسموح به لك.");
    }

    const serverUsersCount = this.vpnUsers.filter(v => v.serverId === selectedServer.id).length;
    if (serverUsersCount >= selectedServer.limit) {
       throw new Error("عذراً، السيرفر ممتلئ حالياً.");
    }

    // Next auto name: VERTEX_xxxx
    const uuid = randomUUID();
    const newUsername = `VERTEX-${uuid.substring(0, 5).toUpperCase()}`;
    const quotaBytes = 100 * 1024 * 1024 * 1024; // 100 GB
    const expiryTime = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 Days
    let finalUrl = ""; // Declared outside try block

    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    
    // Call X-UI API
    try {
      let baseUrls = [];
      let originalUrl = selectedServer.panelUrl.trim();
      
      if (!originalUrl.startsWith("http://") && !originalUrl.startsWith("https://")) {
        // Try http first, then https if http fails
        baseUrls = [`http://${originalUrl}`, `https://${originalUrl}`];
      } else {
        baseUrls = [originalUrl];
      }
      
      let loginRes: Response | null = null;
      let baseUrl = "";
      let fetchError: any = null;

      // 1. Login
      for (const url of baseUrls) {
        try {
          const loginUrl = `${url.replace(/\/$/, '')}/login`;
          loginRes = await fetch(loginUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              username: selectedServer.username,
              password: selectedServer.plainPass
            })
          });
          baseUrl = url;
          fetchError = null;
          break; // Success or at least got a response
        } catch (e: any) {
          fetchError = e;
          // Continue to next url if "fetch failed" (e.g. connection refused/timeout)
        }
      }

      if (fetchError && !loginRes) {
        let msg = fetchError.message;
        if (msg === "fetch failed" || msg.includes("fetch failed") || msg.includes("ECONNREFUSED")) {
            msg = "تعذر الوصول إلى اللوحة. تحقق من صحة عنوان السيرفر والمنفذ.";
        }
        throw new Error(`تعذر الاتصال باللوحة: ${msg}`);
      }

      if (!loginRes) {
        throw new Error("فشل غير متوقع أثناء محاولة تسجيل الدخول");
      }

      let loginData;
      let respText = "";
      try {
         respText = await loginRes.text();
         if (respText) {
             loginData = JSON.parse(respText);
         }
      } catch (e) {}

      if (!loginRes.ok || (loginData && !loginData.success)) {
        let errDesc = loginData?.msg || respText.slice(0, 50) || "بيانات غير صحيحة";
        throw new Error(`تعذر الدخول (${baseUrl}): ${errDesc}`);
      }

      // Get cookie from Set-Cookie header
      const rawCookies = loginRes.headers.get('set-cookie');
      if (!rawCookies) {
         throw new Error("لم يتم استلام جلسة من لوحة السيرفر");
      }
      
      let cookies = rawCookies;
      const sessionMatch = rawCookies.match(/session=([^;]+)/);
      if (sessionMatch) {
         cookies = `session=${sessionMatch[1]}`;
      } else {
         cookies = rawCookies.split(';')[0];
      }

      // Fetch Inbound Details to construct the correct link and check existence
      const getInboundUrl = `${baseUrl.replace(/\/$/, '')}/panel/api/inbounds/get/${selectedServer.inboundId || 1}`;
      finalUrl = `vless://${uuid}@${selectedServer.ip}:${selectedServer.port}?type=tcp&security=none#${newUsername}`;
      let outboundFlow = "";
      let existingClients: any[] = [];
      
      try {
        const inboundRes = await fetch(getInboundUrl, {
          method: 'GET',
          headers: { 
            'Cookie': cookies,
            'Accept': 'application/json'
          }
        });
        
        if (inboundRes.ok) {
           const inboundData = await inboundRes.json();
           if (inboundData && inboundData.success && inboundData.obj) {
              const obj = inboundData.obj;
              
              // Extract existing clients to check for duplication
              try {
                  const inboundSettings = JSON.parse(obj.settings || "{}");
                  existingClients = inboundSettings.clients || [];
              } catch (e) {}

              const protocol = obj.protocol;
              const port = obj.port;
              const stream = JSON.parse(obj.streamSettings);
              console.log("X-UI Stream Settings Parsed:", JSON.stringify(stream).substring(0, 300));
              
              const net = stream.network || "tcp";
              const security = stream.security || "none";
              
              let link = `${protocol}://${uuid}@${selectedServer.ip}:${port}?type=${net}&security=${security}`;
              
              let sni = "";
              if (security === "tls") {
                 sni = stream.tlsSettings?.serverNames?.[0] || stream.tlsSettings?.serverName || stream.tlsSettings?.settings?.serverName || "";
                 const fp = stream.tlsSettings?.fingerprint || "chrome";
                 const alpn = stream.tlsSettings?.alpn ? (Array.isArray(stream.tlsSettings.alpn) ? stream.tlsSettings.alpn.join(",") : stream.tlsSettings.alpn) : "";
                 if (sni) {
                     link += `&sni=${encodeURIComponent(sni)}`;
                     // Include host as well for safety
                     if (net === "tcp") link += `&host=${encodeURIComponent(sni)}`;
                 }
                 if (fp) link += `&fp=${fp}`;
                 if (alpn) link += `&alpn=${encodeURIComponent(alpn)}`;
              } else if (security === "reality") {
                 sni = stream.realitySettings?.serverNames?.[0] || stream.realitySettings?.serverName || stream.realitySettings?.settings?.serverName || "";
                 const pbk = stream.realitySettings?.publicKey || "";
                 const fp = stream.realitySettings?.fingerprint || "chrome";
                 const sid = stream.realitySettings?.shortIds?.[0] || "";
                 const spx = stream.realitySettings?.spiderX || "";
                 if (sni) link += `&sni=${encodeURIComponent(sni)}`;
                 if (pbk) link += `&pbk=${pbk}`;
                 if (fp) link += `&fp=${fp}`;
                 if (sid) link += `&sid=${sid}`;
                 if (spx) link += `&spx=${encodeURIComponent(spx)}`;
              }

              if (net === "ws") {
                 const path = stream.wsSettings?.path || "/";
                 const host = stream.wsSettings?.headers?.Host || stream.wsSettings?.headers?.host || "";
                 if (path) link += `&path=${encodeURIComponent(path)}`;
                 if (host) link += `&host=${encodeURIComponent(host)}`;
              } else if (net === "tcp") {
                 const type = stream.tcpSettings?.header?.type || "none";
                 if (type === "http") {
                    link += `&headerType=http`;
                    const host = stream.tcpSettings?.header?.request?.headers?.Host?.[0] || stream.tcpSettings?.header?.request?.headers?.host?.[0] || "";
                    if (host) link += `&host=${encodeURIComponent(host)}`;
                    const path = stream.tcpSettings?.header?.request?.path?.[0] || "";
                    if (path) link += `&path=${encodeURIComponent(path)}`;
                 }
              } else if (net === "grpc") {
                 const serviceName = stream.grpcSettings?.serviceName || "";
                 const multiMode = stream.grpcSettings?.multiMode ? "multi" : "gun";
                 if (serviceName) link += `&serviceName=${encodeURIComponent(serviceName)}`;
                 link += `&mode=${multiMode}`;
              }

              // Flow for XTLS/TLS/Reality
              // User explicitly requested Flow: None ("") for all created users
              if (protocol === "vless" && (security === "tls" || security === "reality")) {
                  outboundFlow = "";
              }

              link += `#${encodeURIComponent(newUsername)}`;
              finalUrl = link;
           }
        }
      } catch (err) {
        console.error("Failed to parse inbound data for link generation", err);
      }

      // Check if duplicate
      const isDuplicate = existingClients.some(c => c.id === uuid || c.email === newUsername);
      if (isDuplicate) {
         throw new Error("UUID أو اسم المستخدم موجود مسبقاً في اللوحة. حاول مرة أخرى.");
      }

      // 2. Add client to inbound
      const addClientUrl = `${baseUrl.replace(/\/$/, '')}/panel/api/inbounds/addClient`;

      
      const clientConfig = {
        id: uuid,
        flow: outboundFlow,
        email: newUsername,
        limitIp: 1,
        totalGB: quotaBytes,
        expiryTime: expiryTime,
        enable: true,
        tgId: "",
        subId: ""
      };

      const settings = {
        clients: [clientConfig]
      };

      let addSuccess = false;
      let addErrorMsg = "";

      try {
          const addRes = await fetch(addClientUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Cookie': cookies
            },
            body: JSON.stringify({
              id: selectedServer.inboundId || 1,
              settings: JSON.stringify(settings)
            })
          });

          const addText = await addRes.text();
          try {
             const addData = JSON.parse(addText);
             if (addRes.ok && addData.success) {
                addSuccess = true;
             } else {
                addErrorMsg = (addData && addData.msg) || "فشل إضافة المستخدم في لوحة X-UI";
             }
          } catch(e) {
             if (addRes.ok) addSuccess = true; 
          }
      } catch (e: any) {
          addErrorMsg = e.message;
      }

      if (!addSuccess) {
         try {
             // Fallback: Check if client was actually added before failing
             const checkRes = await fetch(getInboundUrl, {
               method: 'GET',
               headers: { 'Cookie': cookies, 'Accept': 'application/json' }
             });
             if (checkRes.ok) {
                 const checkData = await checkRes.json();
                 if (checkData && checkData.success && checkData.obj) {
                     const checkSettings = JSON.parse(checkData.obj.settings || "{}");
                     const checkClients = checkSettings.clients || [];
                     const isAdded = checkClients.some((c: any) => c.id === uuid || c.email === newUsername);
                     if (isAdded) {
                         addSuccess = true;
                     }
                 }
             }
         } catch (checkErr) { /* ignore */ }
      }

      if (!addSuccess) {
         throw new Error(addErrorMsg || "فشل غير معروف في إضافة المستخدم إلى السيرفر");
      }
    } catch (err: any) {
       console.error("X-UI API Error:", err);
       let errorMessage = err.message;
       if (errorMessage === "fetch failed" || errorMessage.includes("fetch failed") || errorMessage.includes("ECONNREFUSED")) {
          errorMessage = "تعذر الوصول إلى لوحة السيرفر. يرجى التأكد من صحة رابط السيرفر وحالة اللوحة.";
       }
       // Throw error to reject generating the user if the server connection fails
       throw new Error(`تعذر الاتصال بالسيرفر 3X-UI: ${errorMessage}`);
    }

    const newUser = {
        id: randomUUID(),
        serverId: selectedServer.id,
        clientId: clientId,
        username: newUsername,
        displayName: "", // Optional label for customers
        quotaGb: 100, // Fixed 100GB
        days: 30, // Fixed 30 Days
        usageGb: 0, 
        isOnline: false,
        vlessUrl: finalUrl,
        createdAt: new Date().toISOString()
    };

    this.vpnUsers.unshift(newUser); // Add to beginning
    this.saveData();
    return newUser;
  }

  updateVpnUserDisplayName(clientId: string, vpnUserId: string, displayName: string) {
    const user = this.vpnUsers.find(v => v.id === vpnUserId && v.clientId === clientId);
    if (!user) throw new Error("المستخدم غير موجود أو لا تملك الصلاحية");
    user.displayName = displayName;
    this.saveData();
    return user;
  }

  getAdminStats() {
    return {
        totalServers: this.servers.length,
        totalClients: this.users.filter(u => u.role === "client").length,
        totalVpnUsers: this.vpnUsers.length,
        onlineVpnUsers: this.vpnUsers.filter(v => v.isOnline).length
    };
  }

  async fetchServerOnlines(server: any) {
    if (!server) return [];
    try {
      let baseUrls = [];
      let originalUrl = server.panelUrl.trim();
      
      if (!originalUrl.startsWith("http://") && !originalUrl.startsWith("https://")) {
        baseUrls = [`http://${originalUrl}`, `https://${originalUrl}`];
      } else {
        baseUrls = [originalUrl];
      }
      
      let loginRes: Response | null = null;
      let baseUrl = "";
      
      for (const url of baseUrls) {
        try {
          const loginUrl = `${url.replace(/\/$/, '')}/login`;
          loginRes = await fetch(loginUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              username: server.username,
              password: server.plainPass
            })
          });
          if (loginRes.ok) {
            baseUrl = url;
            break;
          }
        } catch (e) {}
      }
      
      if (loginRes && baseUrl) {
        let setCookie = loginRes.headers.get("set-cookie");
        let cookiesArray = loginRes.headers.getSetCookie ? loginRes.headers.getSetCookie() : [];
        let cookieString = "";
        if (cookiesArray.length > 0) {
            cookieString = cookiesArray.map((c: string) => c.split(';')[0]).join('; ');
        } else if (setCookie) {
            cookieString = setCookie.split(';')[0];
        }

        const onlinesUrl = `${baseUrl.replace(/\/$/, '')}/panel/api/inbounds/onlines`;
        const onlinesRes = await fetch(onlinesUrl, {
          method: 'POST',
          headers: { 'Cookie': cookieString }
        });
        if (onlinesRes.ok) {
          const jsonData = await onlinesRes.json();
          if (jsonData.success && Array.isArray(jsonData.obj)) {
            return jsonData.obj; 
          }
        }
      }
    } catch(err) {
      console.error("Failed to fetch onlines", err);
    }
    return [];
  }

  async getClientDashboard(clientId: string) {
    const clientUser = this.users.find(u => u.id === clientId);

    // Get server assigned to this client
    const assignedServer = this.servers.find(s => s.id === clientUser?.serverId);
    
    // Get all users created by this client
    const users = this.vpnUsers.filter(v => v.clientId === clientId);
    
    let onlineEmails: string[] = [];
    if (assignedServer) {
        onlineEmails = await this.fetchServerOnlines(assignedServer);
    }

    const totalUsers = users.length;
    let computedOnlineUsers = 0;
    
    users.forEach(u => {
        u.isOnline = onlineEmails.includes(u.username);
        if (u.isOnline) computedOnlineUsers++;
    });

    const totalUsage = users.reduce((acc, curr) => acc + curr.usageGb, 0);
    const totalQuota = users.reduce((acc, curr) => acc + curr.quotaGb, 0);
    
    // Return aggregate
    return {
        clientLimit: clientUser?.limit || 50,
        totalUsers,
        onlineUsers: computedOnlineUsers,
        totalUsage,
        remainingData: totalQuota - totalUsage,
        totalQuota,
        servers: assignedServer ? [{
            id: assignedServer.id,
            name: assignedServer.name,
            ip: assignedServer.ip
        }] : [],
        usersList: users.map(u => ({
            id: u.id,
            displayName: u.displayName,
            v2rayLink: u.vlessUrl,
            username: u.username,
            usageGb: u.usageGb,
            quotaGb: u.quotaGb,
            remainingGb: u.quotaGb - u.usageGb,
            daysRatio: "30 / 30",
            isOnline: u.isOnline,
            serverName: assignedServer?.name || ""
        }))
    };
  }
}
