# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# Note that this schema.rb definition is the authoritative source for your
# database schema. If you need to create the application database on another
# system, you should be using db:schema:load, not running all the migrations
# from scratch. The latter is a flawed and unsustainable approach (the more migrations
# you'll amass, the slower it'll run and the greater likelihood for issues).
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema.define(version: 20190428212920) do

  # These are extensions that must be enabled in order to support this database
  enable_extension "plpgsql"

  create_table "average_caches", force: :cascade do |t|
    t.bigint "rater_id"
    t.string "rateable_type"
    t.bigint "rateable_id"
    t.float "avg", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["rateable_type", "rateable_id"], name: "index_average_caches_on_rateable_type_and_rateable_id"
    t.index ["rater_id"], name: "index_average_caches_on_rater_id"
  end

  create_table "chat_rooms", force: :cascade do |t|
    t.string "title"
    t.bigint "user_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["user_id"], name: "index_chat_rooms_on_user_id"
  end

  create_table "comments", force: :cascade do |t|
    t.integer "user_id"
    t.integer "product_id"
    t.text "comment"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "delayed_jobs", force: :cascade do |t|
    t.integer "priority", default: 0, null: false
    t.integer "attempts", default: 0, null: false
    t.text "handler", null: false
    t.text "last_error"
    t.datetime "run_at"
    t.datetime "locked_at"
    t.datetime "failed_at"
    t.string "locked_by"
    t.string "queue"
    t.datetime "created_at"
    t.datetime "updated_at"
    t.index ["priority", "run_at"], name: "delayed_jobs_priority"
  end

  create_table "events", force: :cascade do |t|
    t.bigint "store_id"
    t.bigint "user_id"
    t.integer "priority"
    t.string "name"
    t.integer "category"
    t.boolean "active"
    t.text "description"
    t.datetime "start_datetime"
    t.datetime "end_datetime"
    t.string "video_link"
    t.string "address"
    t.string "latitude"
    t.string "longitude"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["store_id"], name: "index_events_on_store_id"
    t.index ["user_id"], name: "index_events_on_user_id"
  end

  create_table "favorites", force: :cascade do |t|
    t.string "favoritable_type", null: false
    t.bigint "favoritable_id", null: false
    t.string "favoritor_type", null: false
    t.bigint "favoritor_id", null: false
    t.string "scope", default: "favorite", null: false
    t.boolean "blocked", default: false, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["blocked"], name: "index_favorites_on_blocked"
    t.index ["favoritable_id", "favoritable_type"], name: "fk_favoritables"
    t.index ["favoritable_type", "favoritable_id"], name: "index_favorites_on_favoritable_type_and_favoritable_id"
    t.index ["favoritor_id", "favoritor_type"], name: "fk_favorites"
    t.index ["favoritor_type", "favoritor_id"], name: "index_favorites_on_favoritor_type_and_favoritor_id"
    t.index ["scope"], name: "index_favorites_on_scope"
  end

  create_table "guests", force: :cascade do |t|
    t.string "name"
    t.string "email"
    t.integer "event_id"
    t.integer "host_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "images", force: :cascade do |t|
    t.string "item_type"
    t.bigint "item_id"
    t.string "cover_file_name"
    t.string "cover_content_type"
    t.integer "cover_file_size"
    t.datetime "cover_updated_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["item_type", "item_id"], name: "index_images_on_item_type_and_item_id"
  end

  create_table "messages", force: :cascade do |t|
    t.text "body"
    t.bigint "user_id"
    t.bigint "chat_room_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["chat_room_id"], name: "index_messages_on_chat_room_id"
    t.index ["user_id"], name: "index_messages_on_user_id"
  end

  create_table "order_items", force: :cascade do |t|
    t.string "item_type"
    t.bigint "item_id"
    t.bigint "order_id"
    t.decimal "unit_price", precision: 12, scale: 3
    t.integer "quantity"
    t.decimal "total_price", precision: 12, scale: 3
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["item_type", "item_id"], name: "index_order_items_on_item_type_and_item_id"
    t.index ["order_id"], name: "index_order_items_on_order_id"
  end

  create_table "order_statuses", force: :cascade do |t|
    t.string "name"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "orders", force: :cascade do |t|
    t.bigint "store_id"
    t.bigint "user_id"
    t.bigint "order_status_id"
    t.decimal "subtotal", precision: 12, scale: 3
    t.decimal "tax", precision: 12, scale: 3
    t.decimal "shipping", precision: 12, scale: 3
    t.string "payment_id"
    t.string "buy_order"
    t.boolean "validated", default: false
    t.integer "validator_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "recipient_name"
    t.string "address"
    t.decimal "amount", precision: 12, scale: 3
    t.string "authorization_code"
    t.string "payment_type_code"
    t.string "response_code"
    t.datetime "transaction_date"
    t.string "username"
    t.text "tbk_user"
    t.index ["order_status_id"], name: "index_orders_on_order_status_id"
    t.index ["store_id"], name: "index_orders_on_store_id"
    t.index ["user_id"], name: "index_orders_on_user_id"
  end

  create_table "overall_averages", force: :cascade do |t|
    t.string "rateable_type"
    t.bigint "rateable_id"
    t.float "overall_avg", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["rateable_type", "rateable_id"], name: "index_overall_averages_on_rateable_type_and_rateable_id"
  end

  create_table "products", force: :cascade do |t|
    t.bigint "user_id"
    t.string "item_type"
    t.bigint "item_id"
    t.string "name"
    t.decimal "price", precision: 12, scale: 3
    t.boolean "active"
    t.integer "category"
    t.integer "priority"
    t.text "description"
    t.datetime "start_datetime"
    t.datetime "end_datetime"
    t.integer "stock"
    t.string "image_file_name"
    t.string "image_content_type"
    t.integer "image_file_size"
    t.datetime "image_updated_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.boolean "sale_or_show"
    t.integer "stock_event"
    t.index ["item_type", "item_id"], name: "index_products_on_item_type_and_item_id"
    t.index ["user_id"], name: "index_products_on_user_id"
  end

  create_table "rates", force: :cascade do |t|
    t.bigint "rater_id"
    t.string "rateable_type"
    t.bigint "rateable_id"
    t.float "stars", null: false
    t.string "dimension"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["rateable_id", "rateable_type"], name: "index_rates_on_rateable_id_and_rateable_type"
    t.index ["rateable_type", "rateable_id"], name: "index_rates_on_rateable_type_and_rateable_id"
    t.index ["rater_id"], name: "index_rates_on_rater_id"
  end

  create_table "rating_caches", force: :cascade do |t|
    t.string "cacheable_type"
    t.bigint "cacheable_id"
    t.float "avg", null: false
    t.integer "qty", null: false
    t.string "dimension"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["cacheable_id", "cacheable_type"], name: "index_rating_caches_on_cacheable_id_and_cacheable_type"
    t.index ["cacheable_type", "cacheable_id"], name: "index_rating_caches_on_cacheable_type_and_cacheable_id"
  end

  create_table "schedules", force: :cascade do |t|
    t.bigint "store_id"
    t.integer "day_of_week"
    t.string "opens"
    t.string "closes"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["store_id"], name: "index_schedules_on_store_id"
  end

  create_table "stores", force: :cascade do |t|
    t.float "longitude"
    t.float "latitude"
    t.string "address"
    t.integer "kind"
    t.integer "status"
    t.boolean "delivery"
    t.string "name"
    t.text "description"
    t.string "rut"
    t.string "phone"
    t.string "email"
    t.integer "region"
    t.string "days_opened"
    t.string "time_opened"
    t.string "legal_agent"
    t.string "legal_agent_rut"
    t.string "legal_agent_phone"
    t.string "legal_agent_email"
    t.string "logo_file_name"
    t.string "logo_content_type"
    t.integer "logo_file_size"
    t.datetime "logo_updated_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "stores_users", force: :cascade do |t|
    t.bigint "user_id"
    t.bigint "store_id"
    t.index ["store_id"], name: "index_stores_users_on_store_id"
    t.index ["user_id"], name: "index_stores_users_on_user_id"
  end

  create_table "tickets", force: :cascade do |t|
    t.bigint "event_id"
    t.string "name"
    t.float "price"
    t.integer "stock"
    t.integer "kind"
    t.boolean "active"
    t.datetime "start_date"
    t.datetime "end_date"
    t.string "image_file_name"
    t.string "image_content_type"
    t.integer "image_file_size"
    t.datetime "image_updated_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["event_id"], name: "index_tickets_on_event_id"
  end

  create_table "tickets_users", force: :cascade do |t|
    t.bigint "user_id"
    t.bigint "ticket_id"
    t.index ["ticket_id"], name: "index_tickets_users_on_ticket_id"
    t.index ["user_id"], name: "index_tickets_users_on_user_id"
  end

  create_table "users", force: :cascade do |t|
    t.string "email", default: "", null: false
    t.string "fullname"
    t.string "phone"
    t.string "rut"
    t.string "address"
    t.integer "role"
    t.string "encrypted_password", default: "", null: false
    t.string "oneclick_user"
    t.string "provider"
    t.string "uid"
    t.string "reset_password_token"
    t.datetime "reset_password_sent_at"
    t.datetime "remember_created_at"
    t.integer "sign_in_count", default: 0, null: false
    t.datetime "current_sign_in_at"
    t.datetime "last_sign_in_at"
    t.string "current_sign_in_ip"
    t.string "last_sign_in_ip"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "avatar_file_name"
    t.string "avatar_content_type"
    t.integer "avatar_file_size"
    t.datetime "avatar_updated_at"
    t.index ["email"], name: "index_users_on_email", unique: true
    t.index ["reset_password_token"], name: "index_users_on_reset_password_token", unique: true
  end

  create_table "videos", force: :cascade do |t|
    t.string "title"
    t.text "description"
    t.text "clip"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "clip_file_name"
    t.string "clip_content_type"
    t.integer "clip_file_size"
    t.datetime "clip_updated_at"
  end

  add_foreign_key "chat_rooms", "users"
  add_foreign_key "events", "stores"
  add_foreign_key "events", "users"
  add_foreign_key "messages", "chat_rooms"
  add_foreign_key "messages", "users"
  add_foreign_key "order_items", "orders"
  add_foreign_key "orders", "order_statuses"
  add_foreign_key "orders", "users"
  add_foreign_key "products", "users"
  add_foreign_key "schedules", "stores"
  add_foreign_key "tickets", "events"
end
