const { initAuthCreds } = require("@whiskeysockets/baileys");
const { default: mongoose } = require("mongoose");
const BufferJSON = {
    replacer: (k, value) => {
        if (
            Buffer.isBuffer(value) ||
            value instanceof Uint8Array ||
            value?.type === "Buffer"
        ) {
            return {
                type: "Buffer",
                data: Buffer.from(value?.data || value).toString("base64"),
            };
        }

        return value;
    },

    reviver: (_, value) => {
        if (
            typeof value === "object" &&
            !!value &&
            (value.buffer === true || value.type === "Buffer")
        ) {
            const val = value.data || value.value;
            return typeof val === "string"
                ? Buffer.from(val, "base64")
                : Buffer.from(val || []);
        }

        return value;
    },
};

class WpController {
    collection;
    currentId;

    constructor(id)
    {
        this.currentId = id;
    }
    readData = async (id) => {
        try {
            const data = JSON.stringify(await this.collection.findOne({ _id: id }));
            const parsedData = JSON.parse(data, BufferJSON.reviver);
            return parsedData
        } catch (error) {
            return null;
        }
    };
    writeData = async (data, id) => {
        try {
            const informationToStore = JSON.parse(
                JSON.stringify(data, BufferJSON.replacer)

            );
            const update = {
                $set: {
                    ...informationToStore,
                },
            };
            if (data.me.id.split(':')[0] === id.split(':')[1]) {
                const updated = await this.collection.updateOne({ _id: id }, update, { upsert: true });
                return updated;
            }
            return null;

        }
        catch (err) {
        }
    };
    removeData = async (id) => {
        try {
            await this.collection.deleteOne({ _id: id });
        } catch (_a) {
        }
    };
    useMongoDBAuthState = async (collection) => {
        this.collection = collection;
        const creds = await this.readData(this.currentId);
        return {
            state: {
                creds,
                keys: {
                    get: async (type, ids) => {
                        const data = {};
                        await Promise.all(
                            ids.map(async (id) => {
                                let value = await this.readData(`${type}-${id}`);
                                if (type === "app-state-sync-key") {
                                    value = proto.Message.AppStateSyncKeyData.fromObject(data);
                                }
                                data[id] = value;
                            })
                        );
                        return data;
                    },
                    set: async (data) => {
                        const tasks = [];
                        for (const category of Object.keys(data)) {
                            for (const id of Object.keys(data[category])) {
                                const value = data[category][id];
                                const key = `${category}-${id}`;
                                tasks.push(value ? this.writeData(value, key) : this.removeData(key));
                            }
                        }
                        await Promise.all(tasks);
                    },
                },
            },
            saveCreds: () => {
                return this.writeData(creds, this.currentId);
            },
        };
    }
}

module.exports = {WpController, BufferJSON};
