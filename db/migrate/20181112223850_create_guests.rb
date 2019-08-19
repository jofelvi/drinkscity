class CreateGuests < ActiveRecord::Migration[5.1]
  def change
    create_table :guests do |t|
      t.string :name
      t.string :email
      t.integer :event_id
      t.integer :host_id

      t.timestamps
    end
  end
end
