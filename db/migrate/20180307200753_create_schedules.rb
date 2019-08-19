class CreateSchedules < ActiveRecord::Migration[5.1]
  def change
    create_table :schedules do |t|
      t.references :store, foreign_key: true
      t.integer :day_of_week
      t.string :opens
      t.string :closes

      t.timestamps
    end
  end
end
